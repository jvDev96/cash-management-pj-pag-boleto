# Decisões técnicas — extração completa

Todo comentário `DECISAO`/`PORQUE` do código, back e front, na ordem em que os
arquivos aparecem no projeto. Cada entrada referencia arquivo, linha e a
construção (classe/método/campo/função) a que se aplica. Gerado a partir do
código-fonte — não editorializado, é o texto que está no repositório.

Ver também: [README.md](../README.md) (resumo curado + como rodar),
[Mapa da Campanha](https://claude.ai/artifact/Q5cLkmdyfS7LD9qB8uH6d7) (justificativa
de arquitetura) e [Arquitetura Implementada](https://claude.ai/artifact/9BkZn2ERo82VNqPtAHkbwc)
(referência técnica pós-implementação).

---

## Backend

### `BoletoSagaBackendApplication.java:7` — `@EnableScheduling`
> **DECISAO:** `@EnableScheduling` aqui.
> **PORQUE:** sem essa anotação em algum lugar da configuração, métodos
> anotados com `@Scheduled` simplesmente nunca rodam — silenciosamente,
> sem erro nenhum, o que é uma pegadinha clássica de Spring Boot.

### `messaging/BoletoValidadoEvent.java:14` — métodos de fábrica `sucesso()`/`falha()`
> **DECISAO:** métodos de fábrica nomeados (sucesso/falha) em vez de deixar
> quem monta o evento chamar `new BoletoValidadoEvent(id, true, x, y, null)`
> direto.
> **PORQUE:** um construtor com 5 posições, incluindo um boolean solto e um
> null implícito, não deixa claro no ponto de chamada qual é o caminho
> feliz e qual é o de falha. `sucesso(...)`/`falha(...)` leem como frase.

### `messaging/ContaSaldoListener.java:20` — `LIMITE_SALDO_INSUFICIENTE`
> **DECISAO:** limiar de R$700 pra "saldo insuficiente" na reserva.
> **PORQUE:** precisa bater com a regra determinística combinada — dar pra
> escolher o caminho da saga só pelo valor digitado, sem depender de sorte.

### `messaging/LiquidacaoListener.java:20` — `LIMITE_FALHA_LIQUIDACAO`
> **DECISAO:** só verifica o limiar de R$500 aqui, sem repetir o de R$700.
> **PORQUE:** um valor ≥ R$700 já teria sido barrado antes, na reserva de
> saldo — no fluxo normal, a saga nunca chega até aqui com esse valor. É
> uma simulação pro case, não uma validação defensiva de produção.

### `messaging/SagaMessagingConfig.java:67` — bean `sagaQueues()`
> **DECISAO:** uma única `Declarables` montada a partir da lista de routing
> keys, em vez de um par de `@Bean` (fila + binding) copiado e colado 8 vezes.
> **PORQUE:** as 8 filas são estruturalmente idênticas (mesma config de dead
> letter, mesma exchange) — só muda o nome. Copiar o mesmo bloco 8 vezes
> vira 8 lugares pra atualizar se a config de DLQ mudar amanhã.

### `messaging/SagaMessagingConfig.java:85` — listener de `ApplicationReadyEvent`
> **DECISAO:** forçar `amqpAdmin.initialize()` explicitamente quando a
> aplicação termina de subir.
> **PORQUE:** nesta versão (Spring Boot 4.1.1), verificamos na prática que o
> `RabbitAdmin` NÃO declara sozinho as filas/exchanges/bindings na
> inicialização (comportamento automático esperado em versões anteriores do
> Spring não está disparando aqui — confirmado isolando o problema: os beans
> `Declarable` existem, mas nada chega no broker até chamarmos `initialize()`
> manualmente). Em vez de confiar nesse comportamento implícito, forçamos de
> forma explícita e documentada.

### `messaging/SagaMessagingConfig.java:99` — bean `MessageConverter`
> **DECISAO:** `JacksonJsonMessageConverter` reaproveitando o `JsonMapper`
> que o Spring Boot já autoconfigura (injetado), em vez de criar um novo "cru".
> **PORQUE:** (1) mensagem em JSON legível na UI do RabbitMQ, em vez de bytes
> de serialização nativa do Java; (2) reaproveitar o `JsonMapper` do Spring
> evita qualquer divergência de configuração entre o que o resto da app usa
> pra JSON (ex: respostas REST) e o que a mensageria usa. Nota à parte: a
> partir do Jackson 3.x o pacote mudou de `com.fasterxml.jackson` para
> `tools.jackson`, e o Spring AMQP tem uma classe nova pra isso
> (`JacksonJsonMessageConverter`, sem o "2").

### `messaging/SimulacaoDelay.java:3` — classe `SimulacaoDelay`
> **DECISAO:** delay artificial centralizado, usado pelos listeners simulados.
> **PORQUE:** sem isso, o processamento é rápido demais (sub-segundo) pra ver
> a timeline se atualizando de verdade numa demonstração/vídeo — cada etapa
> fica com o mesmo timestamp, quase instantâneo. Só existe por causa disso;
> não é requisito de negócio, nem estaria aqui numa integração real (o
> serviço externo de verdade teria sua própria latência).

### `messaging/ValidacaoBoletoListener.java:15` — classe `ValidacaoBoletoListener`
> **DECISAO:** este listener simula o serviço "Validação de Boleto" dentro
> do mesmo processo Spring Boot, consumindo de uma fila de verdade, não
> chamado como método Java direto.
> **PORQUE:** o PDF permite/pede que o serviço externo seja mockado — mas o
> ponto do case é demonstrar mensageria assíncrona de verdade. Simular via
> fila (em vez de só um método Java) mantém o desacoplamento real: o
> Orchestrator não sabe (nem deveria saber) que isso roda no mesmo processo.

### `messaging/ValidacaoBoletoListener.java:39` — método `validar` (ordem publish/ack)
> **DECISAO:** publica a resposta ANTES de confirmar (ack) a mensagem original.
> **PORQUE:** se o ack viesse primeiro e o `convertAndSend` falhasse depois, a
> mensagem original já teria sumido (confirmada) mas a resposta nunca teria
> sido publicada — perda silenciosa, sem como recuperar. Nessa ordem, se
> `convertAndSend` falhar, o catch ainda pode dar nack válido (a mensagem
> original nunca foi confirmada) e ela vai pra DLQ, onde pode ser investigada.
> (Mesmo padrão aplicado em `ContaSaldoListener` e `LiquidacaoListener`.)

### `messaging/ValidacaoBoletoListener.java:55` — método `processar`
> **DECISAO:** regra determinística pelo final da linha digitável, não aleatória.
> **PORQUE:** pra demonstrar cada caminho da saga (feliz e de falha) de forma
> controlável e repetível no vídeo/entrevista — você escolhe o número, não
> depende de sorte.

### `Saga.java:42` — campo `protocolo`
> **DECISAO:** nullable, só preenchido quando a saga chega em `CONCLUIDO`.
> **PORQUE:** protocolo só faz sentido pra um pagamento que realmente
> aconteceu — não existe "protocolo de tentativa" nesse domínio.

### `Saga.java:53` — campo `version` (`@Version`)
> **DECISAO:** campo `@Version` pra lock otimista.
> **PORQUE:** existe uma corrida real possível entre o `SagaOrchestrator`
> (reagindo a um evento chegando) e o `SagaTimeoutScheduler` (decidindo que
> essa saga está presa) tentando escrever no MESMO registro ao mesmo tempo,
> com decisões diferentes. Sem isso, quem salva por último vence
> silenciosamente, podendo sobrescrever um resultado real com um timeout
> falso (ou o contrário). Com `@Version`, o Hibernate controla um número de
> versão sozinho: se dois processos tentam salvar a partir da mesma versão,
> o segundo recebe `ObjectOptimisticLockingFailureException`.

### `Saga.java:67` — construtor protegido
> **DECISAO:** construtor vazio `protected`, não `public`.
> **PORQUE:** o Hibernate exige um construtor sem argumentos pra conseguir
> instanciar a entidade via reflection ao ler do banco — mas ninguém no
> nosso código deveria criar uma `Saga` "vazia" na mão, por isso `protected`
> em vez de `public`.

### `Saga.java:85` — método `transicionarPara`
> **DECISAO:** `transicionarPara(...)` em vez de um `setEstado(...)` público.
> **PORQUE:** um setter genérico deixaria qualquer chamador colocar a saga em
> QUALQUER estado, ignorando a máquina de estados. Esse método reusa
> `SagaState.podeTransicionarPara` pra se proteger — a entidade nunca fica
> num estado que a máquina não permite.

### `SagaOrchestrator.java:29` — pacote da classe `SagaOrchestrator`
> **DECISAO:** `SagaOrchestrator` mora em `saga` (domínio), não em `saga.messaging`.
> **PORQUE:** ele é quem DECIDE o que fazer a seguir, não só transporta
> mensagem — mora mais perto de `Saga`/`SagaState` do que da infraestrutura
> pura de fila. Os listeners simulados ficam em `messaging` porque são
> adaptadores substituindo sistemas externos; o Orchestrator é o cérebro do
> próprio case.

### `SagaOrchestrator.java:50` — record `ResultadoIniciarSaga`
> **DECISAO:** registro devolvido pelo `iniciar()` diz se a saga é nova ou já existia.
> **PORQUE:** o controller REST precisa saber disso pra decidir o código HTTP
> certo — 202 (Accepted) numa criação de verdade, 200 (OK) num reenvio
> idempotente que só devolveu o que já existia.

### `SagaOrchestrator.java:58` — método `iniciar`
> **DECISAO:** duas camadas de defesa contra idempotencyKey duplicada.
> **PORQUE:** (1) `findByIdempotencyKey` antes de criar cobre o caso comum
> (reenvio depois que a primeira saga já existe). (2) capturar
> `DataIntegrityViolationException` cobre a corrida real — duas requisições
> com a MESMA chave chegando ao mesmo tempo, as duas passando pelo `findBy`
> antes de qualquer uma salvar. Nesse caso a constraint UNIQUE do banco
> rejeita a segunda gravação; em vez de deixar isso virar um erro feio pro
> cliente, buscamos de novo e devolvemos a saga que "venceu" a corrida.

### `SagaOrchestrator.java:92` — método `salvarComHistorico`
> **DECISAO:** helper único que sempre salva a saga E registra a transição no
> histórico, junto.
> **PORQUE:** evita esquecer de logar em algum dos vários pontos que mudam
> estado — o histórico existe especificamente pra alimentar a timeline do
> front (timestamp por etapa, e qual etapa estava em andamento quando a saga
> falhou), então toda gravação de saga precisa gerar uma linha.

### `SagaOrchestrator.java:103` — método `registrarTransicao`
> **DECISAO:** separado de `salvarComHistorico()` especificamente pro caso da
> dupla transição (`SALDO_RESERVADO` → `LIQUIDACAO_ENVIADA`) em
> `aoReservarSaldo`, onde só existe UM save da saga (de propósito, pra não
> reabrir a janela de corrida já corrigida antes), mas a timeline do front
> precisa das DUAS linhas de histórico mesmo assim.
> **PORQUE:** não salva a saga de novo aqui — só registra que ela passou por
> esse estado, no instante em que passou.

### `SagaOrchestrator.java:114` — método `gerarProtocolo`
> **DECISAO:** formato `"ITU-"` + 7 dígitos aleatórios, sem garantia formal
> de unicidade (sem constraint UNIQUE no banco).
> **PORQUE:** é só um número de referência pra exibição/suporte, não uma
> chave de negócio (quem identifica a saga de verdade é o sagaId/UUID) —
> colisão teoricamente possível, mas irrelevante pro escopo do case.

### `SagaOrchestrator.java:156` — dentro de `aoReservarSaldo` (ordem save/publish)
> **DECISAO:** as duas transições (`SALDO_RESERVADO` → `LIQUIDACAO_ENVIADA`)
> em memória, UM único save, e SÓ DEPOIS o publish.
> **PORQUE:** a versão anterior salvava `SALDO_RESERVADO`, publicava, e só
> depois salvava `LIQUIDACAO_ENVIADA` — deixando uma janela real onde, se a
> app caísse entre o publish (já enviado) e o segundo save, a resposta do
> `LiquidacaoListener` chegaria rápido e encontraria o estado desatualizado.
> O `podeProcessar` trataria essa resposta legítima como "fora de ordem" e
> descartaria, perdendo o resultado real da liquidação. Sem essa janela: ou
> o estado final já está salvo ANTES do publish, ou o publish falha e a saga
> fica presa em `LIQUIDACAO_ENVIADA` sem o comando ter saído de verdade —
> cenário seguro, que o scheduler de timeout sabe resolver reenviando.

### `SagaOrchestrator.java:239` — método `podeProcessar` (guarda por estado)
> **DECISAO:** guarda de idempotência baseada em ESTADO, não em chave.
> **PORQUE:** se um evento já foi processado antes (redelivery do RabbitMQ,
> at-least-once), a saga já vai estar num estado DIFERENTE do esperado aqui.
> Nesse caso só confirma (ack) sem reaplicar a transição — em vez de deixar
> `transicionarPara(...)` lançar exceção e mandar um evento duplicado, mas
> inofensivo, pra DLQ por engano.

### `SagaOrchestrator.java:245` — método `podeProcessar` (saga nula vs. estado divergente)
> **DECISAO:** `saga == null` lança exceção (vai pra DLQ via o catch do
> listener); estado divergente só retorna `false` (ack, ignora em silêncio).
> **PORQUE:** são categorias diferentes de problema. Estado divergente é
> duplicata/reentrega esperada (at-least-once) — benigno, só ignorar. Saga
> nula é anomalia de verdade: nosso próprio sistema só cria um sagaId a
> partir de uma saga já salva, então um evento com sagaId inexistente indica
> algo genuinamente errado — merece ficar preservado na DLQ pra investigar,
> não sumir com só uma linha de log como rastro.

### `SagaRepository.java:13` — método `findByEstadoInAndAtualizadoEmBefore`
> **DECISAO:** query derivada composta (In + Before) em vez de `@Query` com JPQL.
> **PORQUE:** o Spring Data consegue montar a query só pelo nome do método
> até um certo ponto de complexidade — "estado está numa lista E
> atualizadoEm é anterior a X" ainda cabe nisso. Só partiria pra `@Query` se
> a condição ficasse mais complexa que isso.

### `SagaTimeoutScheduler.java:17` — classe `SagaTimeoutScheduler`
> **DECISAO:** classe separada de `SagaOrchestrator`.
> **PORQUE:** o Orchestrator reage a EVENTOS (o que aconteceu); esse
> scheduler reage à PASSAGEM DE TEMPO (o que não aconteceu). São dois
> gatilhos diferentes de mudança de estado — cada classe fica com uma
> responsabilidade só.

### `SagaTimeoutScheduler.java:55` — catch de `OptimisticLockingFailureException`
> **DECISAO:** capturar essa exceção especificamente e só logar, sem propagar.
> **PORQUE:** significa que a saga mudou de estado entre a consulta e o save
> — o `SagaOrchestrator` processou um evento real bem nessa janela (a
> corrida que o `@Version` existe pra proteger). Não é erro do sistema, é o
> timeout chegando tarde demais — a saga já não precisa mais dele.

### `SagaTransicao.java:14` — classe `SagaTransicao`
> **DECISAO:** log append-only, sem `estadoAnterior` armazenado.
> **PORQUE:** cada linha é só "essa saga esteve nesse estado, nesse
> instante" — o estado anterior é derivável olhando a linha
> cronologicamente anterior pra mesma sagaId, não precisa duplicar o dado.
> Existe só pra alimentar a timeline do front (timestamp por etapa + qual
> etapa estava em andamento quando a saga falhou) — não é a entidade `Saga`
> principal, que continua guardando só o estado ATUAL.

### `web/ConsultaBoletoService.java:9` — classe `ConsultaBoletoService`
> **DECISAO:** consulta de boleto (RF03) é síncrona, sem passar pelo RabbitMQ.
> **PORQUE:** é uma leitura, não uma ação que muda estado — não precisa da
> garantia de mensageria assíncrona que o pagamento em si precisa. O
> cliente precisa da resposta na hora pra montar a tela de revisão.

### `web/ConsultaBoletoService.java:49` — método `extrairValor`
> **DECISAO:** extrai o valor dos últimos 10 dígitos, dividido por 100.
> **PORQUE:** é assim que o formato real de linha digitável de boleto
> bancário codifica o valor (em centavos) — mesma posição do formato de
> verdade, só que sem validar contra um registro real.

### `web/PagamentoController.java:41` — método `criar` (POST /pagamentos)
> **DECISAO:** 202 (Accepted) quando cria de verdade, 200 (OK) quando só
> devolve uma saga que já existia (reenvio idempotente).
> **PORQUE:** 202 comunica "aceitei, vou processar de forma assíncrona" —
> não faz sentido usar o mesmo código pra "aceitei" e "já tinha aceitado
> antes", são situações diferentes que o cliente pode querer distinguir.

### `web/PagamentoController.java:56` — método `listar` (GET /pagamentos)
> **DECISAO:** `Page<T>` do Spring Data direto, sem DTO de envelope próprio.
> **PORQUE:** `Page` já serializa com `content`/`totalElements`/`totalPages`/`number`
> — exatamente o que a paginação do front precisa, sem reinventar o formato.

### `web/PagamentoResponse.java:11` — record `PagamentoResponse`
> **DECISAO:** DTO separado da entidade `Saga`, não a entidade devolvida direto.
> **PORQUE:** a entidade carrega detalhe de persistência (`@Version`, por
> exemplo) que não é assunto da API. Desacoplar o contrato HTTP do formato
> do banco significa que um pode mudar sem quebrar o outro.

### `web/PagamentoResponse.java:18` — record `HistoricoEntry`
> **DECISAO:** histórico embutido na mesma resposta, não um endpoint separado.
> **PORQUE:** o front faz polling nesse endpoint repetidamente — trazer tudo
> que a timeline precisa numa chamada só evita orquestrar duas requisições
> por tick de polling.

### `web/PagamentoResumoResponse.java:10` — record `PagamentoResumoResponse`
> **DECISAO:** DTO separado de `PagamentoResponse`, sem o histórico.
> **PORQUE:** a tela de lista/histórico não precisa da timeline completa de
> cada pagamento, só o resumo — buscar o histórico linha a linha seria custo
> desnecessário numa lista paginada.

### `web/WebConfig.java:10` — método `addCorsMappings`
> **DECISAO:** libera explicitamente só a origem do Vite em desenvolvimento
> (`localhost:5173`), não um wildcard `"*"`.
> **PORQUE:** front e back são serviços separados por decisão arquitetural
> desde o início do projeto (não um monolito) — CORS precisa existir de
> verdade, com allowlist explícita, não só silenciado com `"*"`.

---

## Frontend

### `components/BoletoInput.tsx:28` — cálculo de `mensagemErro`
> **DECISAO:** `resultado.motivo` é nullable (`MotivoInvalido` inclui null),
> mas `MENSAGENS_POR_MOTIVO` só tem chave pros motivos de erro de verdade —
> precisa da guarda antes de indexar o mapa, senão o TypeScript reclama.

### `components/BotaoVoltar.tsx:4` — componente `BotaoVoltar`
> **DECISAO:** componente próprio, não só uma classe CSS compartilhada.
> **PORQUE:** usado em 2 páginas com o MESMO comportamento (`navigate(-1)`)
> — não só o estilo se repetia, o `onClick` também. Extrair o componente
> inteiro evita duplicar as duas coisas.

### `components/Layout.tsx:9` — localização do componente `Layout`
> **DECISAO:** `Layout` fica em `components/`, não em `pages/`.
> **PORQUE:** é usado por TODAS as páginas, não é uma tela em si.

### `components/PaymentReviewCard.tsx:44` — função `formatarData`
> **DECISAO:** constrói a `Date` a partir de ano/mês/dia separados, não de
> `new Date(dataIsoCompleta)`.
> **PORQUE:** `new Date("2026-10-15")` é interpretado como meia-noite UTC —
> ao formatar de volta no fuso local (Brasil, UTC-3), a data pode "voltar"
> um dia. Construir com `(ano, mes-1, dia)` usa meia-noite LOCAL, evitando o bug.

### `components/PaymentStatusTracker.tsx:16` — retorno antecipado quando `estado` é null
> **DECISAO:** sem pagamento em andamento (estado null), não renderiza nada.
> **PORQUE:** essa tela só faz sentido depois que o usuário confirmou um
> pagamento — `montarTimeline` já devolve `[]` nesse caso, então só
> refletimos isso no componente.

### `components/PaymentStatusTracker.tsx:58` — helpers privados (`iconePorStatus`, etc.)
> **DECISAO:** helpers privados (sem export), só usados por este componente.
> **PORQUE:** não há outro consumidor hoje — mesma regra do `MAX_LENGTH_INPUT`
> no `BoletoInput`, não promove pra arquivo/export público sem necessidade real.

### `hooks/useBoletoPreview.ts:31` — parse do JSON independente de `res.ok`
> **DECISAO:** parseia o JSON independente do status HTTP (não checa `res.ok`).
> **PORQUE:** o backend devolve 404 com corpo válido quando não encontra
> (`encontrado:false` + `motivoFalha`) — isso é uma resposta de domínio, não
> um erro de rede. `fetch` só lança exceção em falha real (rede fora do ar,
> CORS bloqueado) ou se o JSON vier corrompido.

### `hooks/useBoletoValidation.ts:7` — função `alterarLinhaDigitavel`
> **DECISAO:** sanitização (remover pontuação) acontece aqui, no setter,
> única borda de entrada.
> **PORQUE:** garante que o estado interno do hook — e tudo que consome ele
> depois — sempre trabalha com dígito puro, sem repetir a limpeza em cada
> consumidor.

### `hooks/usePaymentHistory.ts:20` — hook `usePaymentHistory`
> **DECISAO:** mesmo padrão do `useBoletoPreview` — `useEffect` + `AbortController`.
> **PORQUE:** trocar de página rápido (próximo/anterior várias vezes) tem o
> mesmo risco de condição de corrida — resposta antiga chegando depois da
> mais nova e sobrescrevendo o estado com a página errada.

### `hooks/usePaymentSaga.ts:46` — cálculo de `falhou`
> **DECISAO:** `falhou` é derivado aqui, não recalculado na UI.
> **PORQUE:** "quais estados são falha terminal" é conhecimento de domínio —
> mora perto do `SagaState`, não duplicado em cada componente que precisa
> decidir se mostra o botão "Tentar Novamente".

### `hooks/usePaymentSaga.ts:79` — função `reiniciar`
> **DECISAO:** `reiniciar` troca a idempotency key, não reusa a antiga.
> **PORQUE:** a saga anterior terminou num estado terminal (REJEITADO/FALHOU),
> sem transição de volta — reenviar com a MESMA chave só devolveria a saga
> morta de novo (idempotência = mesma decisão pra sempre). "Tentar Novamente"
> é uma tentativa NOVA e deliberada (o clique), não um reenvio acidental —
> por isso merece chave própria.

### `hooks/usePaymentSaga.ts:113` — catch do polling
> **DECISAO:** falha pontual de rede só loga, não para o polling nem seta erro.
> **PORQUE:** um hiccup de rede no meio do polling não deveria derrubar a
> tentativa inteira — a próxima iteração do intervalo tenta de novo.

### `pages/HistoricoPage.tsx:79` — type `Categoria` e `categoriaPorEstado`
> **DECISAO:** `categoria` (concluído/falhou/andamento) é um mapeamento
> novo, não reaproveita `StatusLinha` de `timeline/montarTimeline.ts`.
> **PORQUE:** `StatusLinha` é sobre a POSIÇÃO de uma etapa na timeline
> (processando/pendente/concluído/falhou POR LINHA); aqui é sobre o
> DESFECHO do pagamento inteiro, só 3 categorias — conceito de domínio
> diferente, mesmo parecendo similar.

### `pages/PagamentoPage.tsx:25` — função `tentarNovamente`
> **DECISAO:** "Tentar Novamente" reinicia a saga (chave nova) e reenvia o
> MESMO boleto/valor que já estavam em mãos — não pede pro usuário digitar
> de novo.
> **PORQUE:** é a mesma intenção (pagar esse boleto), só uma tentativa nova.

### `pages/PagamentoPage.tsx:38` — função `novoPagamento`
> **DECISAO:** "Novo Pagamento" reseta tudo — saga E o campo de entrada.
> **PORQUE:** diferente de "Tentar Novamente", aqui a intenção mudou (outro
> boleto, ou só recomeçar do zero) — não faz sentido manter a linha
> digitável antiga preenchida.

### `pages/PagamentoPage.tsx:47` — troca de tela por `sagaId`
> **DECISAO:** `sagaId` existe → mostra só o tracker; senão → input + revisão.
> **PORQUE:** é a mesma troca de tela que o Figma mostra — depois de enviar,
> o formulário de entrada sai de cena, só o acompanhamento fica visível.

### `timeline/montarTimeline.ts:23` — loop principal de `montarTimeline`
> **DECISAO:** loop imperativo (`for`) em vez de `.map` com flag externa.
> **PORQUE:** a regra depende de um "gap ainda não encontrado" que precisa
> persistir entre iterações — um `for` deixa essa dependência sequencial
> explícita, em vez de escrever um `.map` com efeito colateral escondido.

### `validation/boletoValidator.ts:29` — retorno de `detectarFormato`
> **DECISAO:** retorno é um union type de strings literais, não boolean nem
> string livre.
> **PORQUE:** esse valor vai virar branching de lógica (qual validação
> rodar depois), então o compilador precisa conhecer os 4 casos possíveis —
> não só exibição pro usuário.

### `validation/boletoValidator.ts:44` — função `validarLinhaDigitavel`
> **DECISAO:** validar "só dígitos" acontece na borda (sanitização), não aqui.
> **PORQUE:** evitar checagem duplicada — a função de domínio confia no
> contrato de que só recebe string já sanitizada, mesmo padrão usado pro backend.

### `validation/mod10.ts:1` — função `calcularMod10`
> **DECISAO:** Mod10 puro, sem nenhuma dependência de React.
> **PORQUE:** é um algoritmo, não um componente — testável isoladamente,
> reutilizável em qualquer lugar que precise validar um campo.

### `validation/mod11.ts:13` — regra especial do dígito verificador
> **DECISAO:** 0, 1 ou ≥10 viram 1.
> **PORQUE:** é a regra específica do DV geral de boleto (Mod11) — esses
> três resultados não são dígitos verificadores válidos nesse contexto.
