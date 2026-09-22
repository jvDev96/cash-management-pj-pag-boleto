# Roteiro de Reconstrução — se eu tivesse que fazer de novo, sozinho

Não é a ordem cronológica em que o projeto foi construído — é a ordem **lógica**:
cada passo só existe porque o anterior já existe. Serve pra estudar (entender a
dependência real entre as peças) e pra recriar do zero sem se perder.

Pra cada passo: **o quê**, **por quê nessa posição**, **o que quebraria se
pulasse ou invertesse**.

---

## Parte 1 — Backend: domínio antes de infraestrutura

A ideia central: construir o que **não depende de nada externo** primeiro
(nem banco, nem fila), e só depois ligar os fios de infraestrutura em volta
dele. Isso também é o que torna o domínio testável com JUnit puro, sem subir
Postgres/RabbitMQ.

### 1. `SagaState` — a máquina de estados, isolada

8 estados (`RECEBIDO` → `VALIDADO` → `SALDO_RESERVADO` → `LIQUIDACAO_ENVIADA`
→ `CONCLUIDO`; `REJEITADO`/`SALDO_LIBERADO`/`FALHOU` cobrindo rejeição e
compensação), um `EnumMap<SagaState, Set<SagaState>>` estático dizendo quais
transições são válidas a partir de cada estado, e um único método público:
`podeTransicionarPara(alvo)`.

**Por quê primeiro:** é a regra de negócio mais fundamental do case inteiro —
"o que pode virar o quê" — e não depende de mais nada (nem de `Saga`, nem de
Spring, nem de banco). Se essa regra estiver errada, tudo que vem depois
herda o erro.

**Se pular:** a validação de transição vazaria pra dentro de `Saga` ou do
`SagaOrchestrator` como um monte de `if` espalhado — perde o lugar único e
testável onde a regra vive.

### 2. `Saga` (entidade) + `SagaRepository`

A entidade dona do estado atual, do `idempotencyKey` (com constraint
`UNIQUE`), do `@Version` (lock otimista), e do único método que muda estado:
`transicionarPara(...)`, que valida contra `SagaState.podeTransicionarPara`
antes de aceitar — não existe `setEstado` genérico em lugar nenhum.

**Por quê aqui:** só faz sentido persistir uma máquina de estados depois que
a máquina em si existe. `@Version` entra desde já porque a corrida que ele
protege (Orchestrator reagindo a evento vs. Scheduler detectando timeout,
escrevendo a mesma linha ao mesmo tempo) é estrutural do desenho, não um
detalhe pra "adicionar depois".

**Se pular o `@Version`:** funcionaria em todos os testes manuais (a corrida
é rara), e falharia silenciosamente em produção — um dos dois updates vence
sem erro nenhum, perdendo a transição do outro.

### 3. `SagaTransicao` (histórico) + `SagaTransicaoRepository`

Entidade append-only: cada linha é uma transição (`sagaId`, `estado`,
`timestamp`). Nunca é alterada, só inserida.

**Por quê aqui, e não junto com `Saga`:** é uma decisão derivada de um
requisito de UI (o Figma pedia uma timeline com timestamp por etapa, não só
"estado atual") — decidir isso cedo evita ter que voltar depois e
re-instrumentar cada ponto que muda estado pra também gravar histórico.

**Se pular:** a timeline do front não teria como mostrar "em qual etapa
exata a saga estava quando falhou" — só o estado final.

### 4. Mensageria: topologia antes de mensagem

`SagaMessagingConfig` — exchange direto (`saga.exchange`), 4 filas de
comando + 4 de evento (todas com `x-dead-letter-exchange` apontando pra uma
DLQ compartilhada), um `Declarables` construído a partir de uma lista de
routing keys (não 8 pares de `@Bean` copiados e colados).

**Por quê antes das mensagens em si:** a topologia (quais filas existem,
como se conectam à DLQ) é uma decisão de infraestrutura independente do
conteúdo de cada mensagem — definir isso primeiro dá o "esqueleto" onde as
mensagens vão trafegar.

**Se pular a DLQ desde o início:** teria que voltar depois e adicionar
`x-dead-letter-exchange` em cada fila já criada — mais fácil de esquecer uma
do que decidir uma vez, num loop, que todas têm.

### 5. Commands e Events (os DTOs de mensagem)

`ValidarBoletoCommand` / `BoletoValidadoEvent`, `ReservarSaldoCommand` /
`SaldoReservadoEvent`, `EnviarLiquidacaoCommand` / `LiquidacaoProcessadaEvent`,
`CompensarReservaCommand` / `SaldoLiberadoEvent` — cada um um `record` simples
serializado em JSON (Jackson).

**Por quê aqui:** agora que a topologia existe, dá pra definir o que
trafega em cada fila — o par comando/evento espelha exatamente as 4 etapas
da saga (validar → reservar saldo → liquidar → compensar, se preciso).

### 6. `SagaOrchestrator` — o cérebro

Um `@RabbitListener` por evento de entrada (`aoValidarBoleto`,
`aoReservarSaldo`, `aoProcessarLiquidacao`, `aoLiberarSaldo`), cada um
decidindo a próxima transição e publicando o próximo comando — ou registrando
falha e indo para `REJEITADO`/iniciando compensação.

Duas peças de correção vivem aqui, e valem a pena entender de cor:

- **Guarda de idempotência por estado** (`podeProcessar`): RabbitMQ é
  *at-least-once* — a mesma mensagem pode chegar duas vezes. Em vez de uma
  chave de deduplicação separada, o próprio estado da saga já diz se o
  evento é novo ou repetido: se a saga não está mais no estado esperado, o
  evento é duplicata/fora de ordem — só faz `ack` e ignora.
- **Ordem save → publish, nunca o contrário**: toda transição salva a saga
  (e o histórico) **antes** de publicar o próximo comando. Se fosse ao
  contrário e o publish falhasse depois do ack, a mensagem já teria saído
  mas o estado não — inconsistência sem chance de recuperação automática.

**Por quê depois de commands/events, mas antes dos listeners simulados:** o
Orchestrator reage a eventos e emite comandos — só faz sentido escrevê-lo
depois que os dois tipos de mensagem existem. E ele não depende dos
listeners simulados existirem ainda (eles só *respondem* às filas que ele
publica) — pode ser escrito e testado com Mockito isolado, sem RabbitMQ real.

**Se inverter a ordem save/publish:** é exatamente o bug de regressão coberto
pelo teste com `InOrder` — publica antes de salvar, cai o processo entre os
dois passos, e a mensagem já enviada encontra um estado que nunca foi
persistido.

### 7. Listeners simulados (Validação, Conta/Saldo, Liquidação) + `SimulacaoDelay`

Três `@RabbitListener` fazendo o papel de sistemas externos reais — cada um
consome um comando, decide sucesso/falha de forma **determinística** (linha
terminando em `0000` falha a validação; valor ≥ R$700 falha o saldo; valor
entre R$500 e R$699,99 falha a liquidação), e publica o evento de volta.
`SimulacaoDelay.aplicar()` (`Thread.sleep(3000)`) é a primeira linha de cada
um, só pra tornar a timeline visível numa demonstração.

**Por quê só agora:** eles são consumidores das filas de comando que o
Orchestrator já publica — escrevê-los antes seria simular um contrato que
ainda não existe formalmente.

### 8. `SagaTimeoutScheduler` — o segundo gatilho de mudança de estado

Classe **separada** do Orchestrator, de propósito: o Orchestrator reage a
*eventos* (o que aconteceu); o Scheduler reage à *passagem do tempo* (o que
não aconteceu). `@Scheduled` rodando a cada 10s, procurando sagas presas há
mais de 30s num estado que espera resposta (`RECEBIDO`, `VALIDADO`,
`LIQUIDACAO_ENVIADA`, `SALDO_LIBERADO`), aplicando rejeição ou compensação
conforme o estado.

Captura `OptimisticLockingFailureException` especificamente (não genérico) —
significa que o `@Version` da entidade `Saga` (passo 2) acabou de fazer
exatamente o que devia: o Orchestrator processou o evento real bem na janela
entre a consulta do scheduler e o save dele. Não é erro, é o timeout
chegando tarde demais.

**Por quê por último no backend "de domínio":** só faz sentido depois que
existem estados que *podem* ficar presos esperando resposta — ou seja,
depois que o fluxo completo (Orchestrator + listeners) já processa uma saga
do início ao fim.

**Se pular:** uma saga cujo comando se perde (falha de rede, listener caído)
fica presa pra sempre em `LIQUIDACAO_ENVIADA` — sem esse scheduler, não
existe nenhum mecanismo puxando ela de volta pra um estado terminal.

### 9. Camada REST (`PagamentoController`, `BoletoController`, DTOs)

`POST /pagamentos` (recebe `Idempotency-Key` no header, chama
`SagaOrchestrator.iniciar`, devolve `202` se criou de verdade ou `200` se só
devolveu uma saga que já existia), `GET /pagamentos/{id}` (consulta status),
`GET /pagamentos` (lista paginada via `Page<T>` nativo do Spring Data —
serializa `content`/`totalElements`/`totalPages`/`number` sem DTO de
envelope próprio), `BoletoController` (preview de beneficiário/vencimento
antes de confirmar o pagamento).

**Por quê por último:** é a camada mais "de fora" — depende de tudo que veio
antes (Orchestrator pronto pra orquestrar, repositórios prontos pra
consultar). Escrever o controller primeiro seria expor uma API sobre um
domínio que ainda não decide nada sozinho.

---

## Parte 2 — Frontend: algoritmo puro antes de UI

Mesmo princípio do backend: o que não depende de rede nem de React primeiro.

### 10. `mod10.ts` / `mod11.ts` — os algoritmos, isolados

Duas funções puras (`número → dígito verificador`), sem nenhuma dependência
de DOM, fetch ou estado. Testáveis com valores calculáveis à mão.

**Por quê primeiro:** é a mesma lógica que qualquer boleto real usa — vale a
pena isolar e testar exaustivamente antes de decidir onde ela é chamada.

### 11. `boletoValidator.ts` — a regra de negócio por cima do algoritmo

`validarLinhaDigitavel` decide o **tipo** de entrada (boleto bancário de 47
dígitos, código de barras de 44, convênio de 48) e delega pro validador
certo. `MotivoInvalido` (`TAMANHO_INVALIDO | DV_BLOCO_1_INVALIDO | ... |
DV_GERAL_INVALIDO | null`) em vez de só `boolean` — early-return checando
bloco por bloco (DV1 → DV2 → DV3 → DV geral), retornando o primeiro motivo
que falhar, pra mensagem de erro poder ser específica em vez de um
"inválido" genérico.

**Por quê depois de mod10/mod11, antes de qualquer componente:** essa
função é o contrato que a UI inteira consome — decidir a forma dela (o tipo
`MotivoInvalido`) antes de desenhar tela em cima evita ter que voltar depois
e "encaixar" o motivo em um componente já pronto pra só `boolean`.

### 12. `api/config.ts` — a única fonte da `BASE_URL`

Um arquivo, uma constante, lida de variável de ambiente (`.env`).

**Por quê aqui, antes dos hooks:** todo hook que fala com o backend
(passo 13) importa esse arquivo — decidir a URL base uma vez, cedo, evita
strings de URL espalhadas e divergentes pelo código.

### 13. Hooks — a ponte entre a regra de negócio e a tela

Nessa ordem, cada um depende só do anterior:

1. **`useBoletoValidation`** — usa `boletoValidator` direto; nenhuma
   chamada de rede.
2. **`useBoletoPreview`** — busca beneficiário/vencimento no backend
   (`AbortController` pra cancelar busca obsoleta se o usuário digitar de
   novo antes da resposta voltar — evita resposta antiga sobrescrever
   estado mais novo).
3. **`usePaymentSaga`** — o mais complexo: `POST /pagamentos` com
   `Idempotency-Key` gerada uma vez por tentativa (`crypto.randomUUID()`
   guardado em `useRef`, não em `useState`, porque não deve disparar
   re-render), polling a cada 1.5s em `GET /pagamentos/{id}` até estado
   terminal, `falhou` derivado (`REJEITADO`/`FALHOU`) pra decidir se mostra
   "Tentar Novamente", e `reiniciar()` que troca a idempotency key (nunca
   reaproveita — a saga anterior morreu em estado terminal, sem transição de
   volta; reenviar com a mesma chave só devolveria a saga morta de novo).
4. **`usePaymentHistory`** — lista paginada, mesmo padrão de
   `AbortController`.

**Por quê hooks antes de componentes:** cada hook é testável isolado (mock
de `fetch`, fake timers pro polling) sem precisar montar nenhuma tela — a
mesma lógica de "domínio primeiro, depois a casca" do backend.

### 14. `timeline/montarTimeline.ts`

Função pura que transforma o `historico` (array de `{estado, timestamp}`
vindo do backend) numa estrutura pronta pra desenhar a timeline visual.

### 15. Componentes visuais

`BoletoInput` (usa `useBoletoValidation`, exibe `mensagemErro` por
`MotivoInvalido`), `PaymentReviewCard`, `PaymentStatusTracker` (usa
`montarTimeline`), `BotaoVoltar` (extraído como componente próprio — não só
CSS compartilhado — porque markup *e* comportamento se repetem juntos:
`navigate(-1)` no `onClick` e o estilo, sempre os dois juntos), `Layout`.

**Por quê só agora:** um componente visual é a última camada — consome hook
já pronto, não decide regra de negócio.

### 16. Páginas (`HomePage`, `PagamentoPage`, `HistoricoPage`) + roteamento

Compõem os componentes/hooks das camadas anteriores. `PagamentoPage` é onde
"Tentar Novamente" (só aparece se `falhou`) e "Novo Pagamento" (só aparece
em `CONCLUIDO`) vivem — a lógica de quando cada botão aparece é derivada do
`estado` do hook, não decidida na página.

---

## Por que essa ordem, resumido numa frase

**Backend:** máquina de estados → entidade que a usa → histórico dela →
infraestrutura de fila → contratos de mensagem → cérebro que decide →
simulação de sistemas externos → segundo gatilho (tempo) → API REST por
cima de tudo.

**Frontend:** algoritmo puro → regra de negócio sobre o algoritmo →
configuração → hooks (ponte com o backend) → componentes visuais →
páginas que compõem tudo.

Em ambos os casos: **o que não depende de nada vem primeiro; o que expõe
pra fora (REST, telas) vem por último.** Isso não é só estética — é o que
torna cada peça testável isolada, sem precisar subir o sistema inteiro pra
validar uma regra de negócio.
