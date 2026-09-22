# Prova — bateria de perguntas estilo entrevista

Puxada de [`CONCEITOS.md`](CONCEITOS.md) e [`FRASES.md`](FRASES.md). Pesada nos
itens **obrigatórios** do PDF (validação, Saga, mensageria, idempotência, REST) —
os diferenciais entram depois, mais leve. Cada resposta é o **mínimo que precisa
sair na hora**, não a explicação inteira; se travar num ponto, o link volta pro
conceito completo.

**Como usar:** cubra a resposta, responda em voz alta primeiro. Cada pergunta tem
a resposta num bloco recolhido (clique pra abrir) — só abre depois de tentar.

---

## Bloco 1 — Validação de linha digitável (Mod10/Mod11) — obrigatório

<details><summary><b>Q1.</b> Por que a linha digitável (47 dígitos) não pode ser validada com Mod11 direto — precisa "desserializar" pra quê antes?</summary>

O código de barras (44 dígitos) é o dado canônico. A linha digitável é uma
*view* derivada dele, reorganizada em 3 blocos com DV próprio (Mod10) pra
facilitar digitação manual, jogando o campo vencimento+valor pro final. Pra
validar o DV geral (Mod11), tem que remontar o código de barras original
(`Campo1[0..4] + Campo5 + Campo1[4..9] + Campo2[0..10] + Campo3[0..10]`) —
o Mod11 foi desenhado pra rodar sobre o formato canônico, não sobre a view.
→ [[Linha digitável FEBRABAN]]
</details>

<details><summary><b>Q2.</b> Numa linha digitável de 47 dígitos, quais são sempre os 10 últimos dígitos — e qual erro de leitura isso evita citar?</summary>

Sempre o valor (Campo5). Nunca o Campo3 (campo livre do banco, nunca carrega
valor) — mesmo que pareça parecido numericamente. O Campo4 (1 dígito solto,
sem separador visual) é o mais fácil de "sumir" na leitura casual.
</details>

<details><summary><b>Q3.</b> Por que `MotivoInvalido` em vez de só `boolean` no resultado da validação?</summary>

Mensagem de erro específica por causa (tamanho, qual bloco de DV exatamente,
DV geral) em vez de um "inválido" genérico — melhor experiência e mais fácil
de debugar transcrição errada. Implementado com early-return checando bloco
por bloco (DV1 → DV2 → DV3 → DV geral), retornando o primeiro que falhar.
</details>

<details><summary><b>Q4.</b> Código de barras (44 dígitos) e convênio (48 dígitos) têm o mesmo nível de validação que boleto bancário? Por quê?</summary>

Código de barras sim — Mod11 real, reusando `calcularMod11` direto (já está
em ordem canônica, sem precisar reconstruir). Convênio não — só validação
estrutural (tamanho + dígitos), porque o DV de convênio é **condicional**: a
regra muda dependendo de um dígito identificador dentro do próprio número,
não é o mesmo algoritmo fixo. Limitação documentada, não esquecimento.
</details>

<details><summary><b>Q5.</b> Por que a validação é feita no client, e por que só uma vez (sem repetir a checagem depois)?</summary>

Fail-fast antes de qualquer request de rede — feedback imediato. Funções de
domínio depois disso confiam que recebem dígito puro, sem checagem duplicada
(sanitização resolvida uma vez, na borda, mesmo princípio usado depois nos
listeners simulados).
</details>

---

## Bloco 2 — Máquina de estados da Saga — obrigatório

<details><summary><b>Q6.</b> Quais são os 8 estados, e o que é `SALDO_LIBERADO` (o mais fácil de esquecer o papel)?</summary>

`RECEBIDO` → `VALIDADO` → `SALDO_RESERVADO` → `LIQUIDACAO_ENVIADA` →
`CONCLUIDO` (fluxo feliz); `REJEITADO`, `SALDO_LIBERADO`, `FALHOU` (fluxo de
compensação). `SALDO_LIBERADO` não é nem sucesso nem falha — é o estado
**transitório** de quando a compensação está devolvendo o saldo reservado,
antes de pousar em `REJEITADO` (falhou cedo, antes de reservar) ou `FALHOU`
(falhou depois de reservar/tentar liquidar).
</details>

<details><summary><b>Q7.</b> Por que a regra de transição válida mora dentro do próprio enum `SagaState`, e não no `SagaOrchestrator` ou numa classe à parte?</summary>

Coesão (estado e regra sobre o estado são o mesmo conceito), evita
transição inválida passar despercebida, testável sem infraestrutura (sem
Spring/banco/fila), fonte única da verdade. Limite reconhecido: só funciona
bem porque a máquina é pequena e fixa — se precisasse ser configurável em
runtime, um enum hard-coded viraria limitação, não vantagem.
→ frase pronta em [[Por que a regra de transição mora no enum]]
</details>

<details><summary><b>Q8.</b> `transicionarPara(...)` em vez de `setEstado(...)` — que princípio de design é esse, e o que ele evita?</summary>

"Tell, don't ask": em vez de perguntar o estado por fora e decidir lá, manda
o próprio objeto mudar, e ele se protege. `setEstado` público deixaria
qualquer chamador colocar a entidade em qualquer estado, ignorando a
máquina de estados — `transicionarPara` reusa `podeTransicionarPara` e
lança `IllegalStateException` se inválido.
</details>

<details><summary><b>Q9.</b> Por que `@Enumerated(EnumType.STRING)`, e não deixar no padrão?</summary>

Padrão do JPA salva o `ordinal()` (posição numérica). Se um estado novo
entrar no meio do enum ou a ordem mudar, todas as linhas antigas passam a
significar outra coisa **silenciosamente**. `STRING` grava o nome — mudar a
ordem do enum não corrompe dado histórico.
</details>

---

## Bloco 3 — Mensageria RabbitMQ — obrigatório

<details><summary><b>Q10.</b> Explique exchange, routing key, binding e fila numa frase cada, e por que não publicar direto numa fila.</summary>

Exchange decide pra onde encaminhar, não guarda mensagem. Routing key é o
rótulo que vai junto na publicação. Binding é a regra pré-cadastrada
"routing key X vai pra fila Y". Fila guarda até um consumer processar.
Vantagem de não publicar direto: desacoplamento — quem publica só sabe o
rótulo, nunca o endereço físico de quem consome.
→ frase pronta em FRASES.md
</details>

<details><summary><b>Q11.</b> Quantas filas de comando e quantas de evento existem, e qual serviço escuta duas filas de comando ao mesmo tempo?</summary>

4 de comando + 4 de evento + 1 DLQ compartilhada. `ContaSaldoListener`
escuta duas (`reservar-saldo` e `compensar-reserva`) — mesmo "departamento"
respondendo a duas ordens diferentes do orquestrador.
</details>

<details><summary><b>Q12.</b> Por que ack manual, e não automático?</summary>

Automático decide sozinho com base em exceção (sem exceção = ack; com
exceção = nack) — mas não separa falha de negócio (saldo insuficiente: o
listener rodou certo, só decidiu rejeitar — merece ack + evento de falha) de
erro de processamento de verdade (merece nack sem requeue → DLQ). Manual é
o que permite essa distinção.
</details>

<details><summary><b>Q13.</b> Qual é o bug real de ordem ack/publish, e por que a correção não "elimina" o risco, só troca a direção dele?</summary>

Se o `ack` acontece **antes** de publicar a resposta e a publicação falha: a
mensagem original já foi confirmada (perda silenciosa) e o `catch` tentaria
`nack` numa entrega já `ack`ada (inválido no protocolo). Correção: publicar
primeiro, confirmar depois. Mas isso não elimina risco — só troca "perda
silenciosa e irrecuperável" por "duplicata detectável e tratável" (se o
`basicAck` falhar *depois* de um publish bem-sucedido, a mensagem original
nunca é confirmada, o RabbitMQ reentrega, e o listener publica o evento de
novo). É o princípio de entrega **at-least-once**.
</details>

<details><summary><b>Q14.</b> `nack` sem requeue — o que os dois parâmetros significam, e o que evita?</summary>

`basicNack(deliveryTag, multiple, requeue)`. `requeue=false` não devolve a
mensagem pra mesma fila — combinado com `x-dead-letter-exchange`, desvia
automático pra DLQ. Evita loop infinito de reentrega numa mensagem que vai
falhar sempre (ex: JSON malformado).
</details>

<details><summary><b>Q15.</b> Uma mensagem com JSON malformado — um `try/catch` no corpo do listener pega esse erro?</summary>

Não. A conversão (bytes → record) acontece **dentro do Spring, antes** do
método do listener ser chamado. O `ConditionalRejectingErrorHandler`
(padrão do Spring AMQP) trata isso como erro fatal, convertendo pra
`AmqpRejectAndDontRequeueException` automaticamente — direto pra DLQ, sem
passar pelo `try/catch` do método. Verificado ao vivo, não assumido.
</details>

<details><summary><b>Q16.</b> Como o sistema escalaria horizontalmente com 2+ instâncias — precisa de lógica extra pra não duplicar processamento?</summary>

Não. É propriedade da própria fila: "competing consumers" — cada mensagem
vai pra **apenas um** dos consumidores inscritos (dispatch round-robin). O
broker garante isso de fábrica. Subir mais uma instância já distribui carga
sozinho.
</details>

<details><summary><b>Q17.</b> `delivery_mode: 2` + fila `durable: true` — por que os dois juntos, e o que acontece se só um estiver certo?</summary>

`delivery_mode: 2` = mensagem persistente (disco, sobrevive a restart do
broker). Fila durável sem mensagem persistente perde o conteúdo no restart;
mensagem persistente numa fila não-durável some porque a fila em si some.
Os dois precisam andar juntos pra proteger de verdade.
</details>

---

## Bloco 4 — Idempotência e concorrência — obrigatório

<details><summary><b>Q18.</b> Idempotency-Key (header HTTP) e redelivery de mensagem do RabbitMQ resolvem o mesmo problema?</summary>

Não — camadas diferentes. Idempotency-Key protege o **cliente** reenviando
o mesmo `POST /pagamentos` (duplo clique, retry de rede) — evita criar duas
sagas. Redelivery é o **broker** reentregando a mesma mensagem dentro de
uma saga já em andamento (consumidor caiu antes de confirmar) — resolvido
por proteção **baseada em estado** no `SagaOrchestrator` (`podeProcessar`),
não por chave no header.
</details>

<details><summary><b>Q19.</b> Duas requisições com a mesma Idempotency-Key chegam ao mesmo tempo, exatamente na mesma janela — o `findByIdempotencyKey` sozinho resolve isso?</summary>

Não sozinho — as duas passam pelo `findBy` antes de qualquer uma salvar
(nenhuma vê a outra ainda). Segunda camada: a constraint `UNIQUE` no banco
rejeita a segunda gravação (`DataIntegrityViolationException`); o código
captura essa exceção especificamente e busca de novo, devolvendo a saga que
"venceu" a corrida — como se fosse reenvio normal, sem erro feio pro
cliente.
</details>

<details><summary><b>Q20.</b> Pra que serve o `@Version` na entidade `Saga`, e qual corrida real ele protege?</summary>

Lock otimista: o `SagaOrchestrator` (reagindo a evento) e o
`SagaTimeoutScheduler` (detectando timeout) podem tentar escrever a mesma
linha ao mesmo tempo. Sem proteção, quem salva por último vence
silenciosamente — pode sobrescrever um sucesso real com um timeout falso.
Com `@Version`, o segundo write recebe `OptimisticLockingFailureException`
em vez de sobrescrever sem avisar; o scheduler captura essa exceção
especificamente e só loga — a saga não precisava mais do timeout.
</details>

<details><summary><b>Q21.</b> Por que o guard de idempotência do `SagaOrchestrator` é baseado em estado, e não numa chave de deduplicação de mensagem?</summary>

Se o evento já foi processado antes, a saga já estará num estado
**diferente** do esperado — isso já é sinal suficiente de duplicata/fora de
ordem. `podeProcessar` compara o estado atual com o esperado: se diverge,
só confirma (`ack`) sem reagir de novo, sem precisar de infraestrutura
extra de deduplicação.
</details>

---

## Bloco 5 — REST API e testes — obrigatório

<details><summary><b>Q22.</b> `POST /pagamentos` devolve 202 ou 200 — quando cada um, e por quê?</summary>

202 (Accepted) quando cria a saga de verdade — comunica "aceitei, vou
processar assíncrono". 200 (OK) quando só devolve uma saga que já existia
(reenvio idempotente) — situações diferentes, não faz sentido usar o mesmo
código pras duas.
</details>

<details><summary><b>Q23.</b> Por que `Page<T>` do Spring Data direto no `GET /pagamentos`, sem DTO de envelope próprio?</summary>

`Page` já serializa com `content`/`totalElements`/`totalPages`/`number` —
exatamente o que a paginação do front precisa, sem reinventar formato.
</details>

<details><summary><b>Q24.</b> Por que um teste de máquina de estados puro roda ~500x mais rápido que `@SpringBootTest` — o que isso prova sobre a arquitetura?</summary>

`@SpringBootTest` sobe o contexto Spring inteiro; teste de domínio puro
(`SagaStateMachineTest`) não depende de nada disso. Prova concreta do valor
de isolar regra de negócio de infraestrutura: 19 testes de backend rodam
rápido porque a maioria é desse tipo, não porque testa pouco.
</details>

<details><summary><b>Q25.</b> O teste do hook `useBoletoValidation` cobre sanitização + detecção de formato + validação de DV junto — isso é um desvio do padrão de teste unitário?</summary>

Não — é esperado. Testes de `mod10`/`mod11`/`boletoValidator` são unitários
(isolam um comportamento, valor calculável na mão). O hook *conecta* peças
já testadas isoladamente — testá-lo é necessariamente um teste de
integração. Pirâmide de testes na prática: muita unidade embaixo, menos
integração em cima confirmando o encaixe.
</details>

---

## Bloco 6 — Diferenciais (DLQ, histórico, paginação, retry seguro)

<details><summary><b>Q26.</b> DLQ (dead-letter) e a saga terminar `REJEITADO`/`FALHOU` são a mesma coisa?</summary>

Não — eixos ortogonais. `REJEITADO`/`FALHOU` é falha de **negócio**: a
mensagem foi processada com sucesso (`ack` normal), só que o conteúdo diz
"isso falhou" — vai pro estado da saga no banco, nunca toca a DLQ. DLQ é só
falha **técnica** de processamento — exceção de verdade, ou mensagem que
nem converte.
</details>

<details><summary><b>Q27.</b> Por que existe `SagaTransicao` como entidade separada, em vez de só `atualizadoEm` na própria `Saga`?</summary>

Motivado por requisito real de UI (Figma pedia timestamp por etapa, não só
estado atual) — sem isso não dá pra saber em qual etapa exata uma saga
parou. Log append-only (`sagaId`, `estado`, `timestamp`); no
`aoReservarSaldo` (dupla transição com um único save), separado em
`salvarComHistorico` (salva + loga) e `registrarTransicao` (só loga) pra
gerar as duas linhas de histórico sem reabrir a janela de corrida que o
save único corrigiu.
</details>

<details><summary><b>Q28.</b> Diferença de espaçamento entre timestamps no histórico pode indicar o quê?</summary>

Transições rápidas = fluxo normal (de negócio, com ou sem compensação).
Intervalo grande (~30s, o timeout configurado) entre duas linhas = o
`SagaTimeoutScheduler` resgatando uma saga que provavelmente teve uma
mensagem perdida/travada — sinal de que uma DLQ aconteceu no meio do fluxo.
</details>

---

## Bloco 7 — Trade-offs (preparação específica pro "diferencial: discussão de trade-off")

<details><summary><b>T1.</b> Saga orquestrada vs. coreografada — qual foi a escolha, e o trade-off real (não só "orquestrada é melhor")?</summary>

Orquestrada: um componente central (`SagaOrchestrator`) decide "o que vem
depois". Ganho: mais fácil de raciocinar, testar e observar — o fluxo
inteiro está num lugar. Custo real: o orquestrador é um ponto único de
coordenação — cresce em responsabilidade conforme o fluxo cresce, e é
acoplamento (todo serviço "conversa" com ele, não entre si). Coreografada
seria mais desacoplada mas mais difícil de visualizar/depurar o fluxo
completo — trade-off clássico de coordenação central vs. desacoplamento.
</details>

<details><summary><b>T2.</b> Lock otimista (`@Version`) vs. lock pessimista (`SELECT ... FOR UPDATE`) — quando cada um vale mais?</summary>

Otimista assume que colisão é rara, só verifica na hora de salvar (mais
barato no caso comum). Pessimista trava a linha imediatamente — mais caro
sempre, mas evita o custo de "descobrir tarde" que colidiu (retry/nova
tentativa). Escolhido otimista aqui porque a corrida Orchestrator×Scheduler
é exceção, não regra — pagaria um custo constante de lock pessimista pra
proteger um caso raro.
</details>

<details><summary><b>T3.</b> DLQ sem retry automático — qual é o trade-off de não implementar Spring Retry?</summary>

Ganho de não implementar: menos superfície, foco no fluxo obrigatório sob
prazo curto. Custo real: toda falha técnica exige intervenção manual pra
reprocessar da DLQ — sem retry, não existe segunda chance automática.
Mitigante específico deste projeto: falhas simuladas são determinísticas
(reenviar produz a mesma falha) — o ganho de retry automático é maior
contra uma dependência externa genuinamente instável, não aqui. Se
implementado depois, seria aditivo (o guard de idempotência por estado já
existe).
</details>

<details><summary><b>T4.</b> Polling (1.5s) vs. WebSocket/SSE pro status da saga — por que polling, qual o custo?</summary>

RF04 permite polling explicitamente. Ganho: muito mais simples de
implementar e testar (sem conexão persistente, sem servidor stateful por
conexão). Custo: latência de até um intervalo inteiro pra UI perceber
mudança, e requisições desperdiçadas quando nada mudou — WebSocket/SSE
seria push real, evolução natural se a escala justificasse.
</details>

<details><summary><b>T5.</b> Timeout como sinal de falha — por que isso é fundamentalmente uma suposição, não uma certeza, e qual o risco real?</summary>

`SagaTimeoutScheduler` compensa uma saga presa sem confirmar com o sistema
externo se a operação realmente não aconteceu. Se o sistema externo real
processou e só a confirmação se perdeu, compensar seria duplicar um efeito
que já ocorreu. Não é risco real *aqui* porque os serviços simulados sempre
respondem na hora — mas numa integração real, a resposta certa seria
reconciliação ativa (perguntar pro sistema externo "isso aconteceu?") antes
de compensar às cegas.
</details>

<details><summary><b>T6.</b> `useMemo` em toda derivação de estado "porque é mais seguro pra produção" — por que essa instinto está errado aqui?</summary>

`useMemo` tem custo próprio (guardar valor anterior, comparar dependência)
e risco próprio (array de dependência esquecido = stale closure, bug sutil
de validar valor antigo). Só compensa em dois cenários concretos: cálculo
comprovadamente caro, ou necessidade de estabilidade de referência. Nenhum
dos dois se aplica a fatiar uma string de até 47 caracteres — otimizar sem
medir gargalo é complexidade sem benefício comprovado, o oposto de "mais
seguro".
</details>

<details><summary><b>T7.</b> Docker só pra Postgres/RabbitMQ, backend/frontend rodando nativo — qual o trade-off dessa escolha de escopo?</summary>

Ganho: hot-reload e debugger rápidos no código ativamente desenvolvido, sem
camada extra de rede/volume do Docker no meio do ciclo. Custo: menos
"reprodutibilidade total" (quem roda o projeto ainda precisa de Java/Node
instalados localmente, não é um único `docker compose up` pra tudo).
Aceito porque o valor central buscado era eliminar "funciona na minha
máquina" nas dependências difíceis de instalar (Postgres, RabbitMQ/Erlang),
não empacotar o app em si — isso faz mais sentido em produção/CI.
</details>

---

## Bloco 8 — Debugging real / metodologia (mostra processo, não só resultado)

<details><summary><b>Q29.</b> RabbitMQ não declarava filas sozinho ao subir a aplicação — como isolou a causa, sem sair tentando solução aleatória?</summary>

Isolamento por eliminação: primeiro confirmou (log direto) que o bean
`Declarables` estava sendo criado certo, com os 16 itens esperados — ou
seja, não era a config. Depois forçou `amqpAdmin.initialize()` manualmente
num runner temporário e funcionou — provando que a operação em si
funcionava. Concluiu: só o disparo automático não estava acontecendo (não
documentado, comportamento inesperado nesta versão). Fix permanente:
`ApplicationListener<ApplicationReadyEvent>` chamando `initialize()`
explícito.
</details>

<details><summary><b>Q30.</b> Erro de compilação `package com.fasterxml.jackson... does not exist` — como resolveu sem confiar em conhecimento decorado de tutorial?</summary>

Inspecionou o `.jar` de verdade com `javap`/`unzip -l` em vez de assumir.
Descobriu que Jackson 3.x mudou de pacote (`com.fasterxml.jackson` →
`tools.jackson`) e que o Spring Boot 4.1.1 autoconfigura um `JsonMapper`
novo — e que o Spring AMQP já tinha uma classe acompanhando isso
(`JacksonJsonMessageConverter`, sem o "2"). Versão de framework recente
demais pra confiar em tutorial desatualizado.
</details>

<details><summary><b>Q31.</b> Bug da janela entre `convertAndSend` e o segundo `save` numa dupla transição — qual era o cenário exato de perda, e como foi corrigido?</summary>

`SALDO_RESERVADO → LIQUIDACAO_ENVIADA`: versão original salvava a primeira,
publicava, salvava a segunda depois. Se a app caísse entre o publish e o
segundo save, a resposta do `LiquidacaoListener` chegaria rápido e
encontraria o estado desatualizado — o guard de idempotência trataria essa
resposta **legítima** como fora de ordem e descartaria, perdendo o
resultado real. Correção: as duas transições em memória, um único save, só
depois publica — elimina o estado intermediário salvo isoladamente.
</details>

<details><summary><b>Q32.</b> `ddl-auto=update` falhou tentando adicionar a coluna `version` — por que só um `WARN`, e o que isso prova sobre a decisão de usar Flyway em produção?</summary>

`ALTER TABLE ... ADD COLUMN version bigint NOT NULL` falha numa tabela com
linhas existentes (ficariam `NULL`, violando a constraint) — mas o
Hibernate só logou `WARN`, não travou a subida, deixando a coluna nunca
criada e todo acesso subsequente quebrando silenciosamente até alguém
notar. É a prova ao vivo, não só teórica, de por que `ddl-auto=update` é
dev-only — produção usaria migração controlada (Flyway), decisão já
documentada antes desse incidente acontecer.
</details>

---

## Checklist rápido antes da entrevista

- [ ] Consigo desenhar a máquina de 8 estados numa folha em branco, sem olhar
- [ ] Consigo explicar o fluxo de uma mensagem do publish até o ack, com exchange/routing key/binding
- [ ] Consigo justificar as duas camadas de idempotência (HTTP + banco) sem hesitar
- [ ] Consigo citar os 3 bugs reais (ordem save/publish, janela da dupla transição, RabbitAdmin não declarando) e como cada um foi achado
- [ ] Consigo responder os 7 trade-offs do Bloco 7 sem reler a resposta
- [ ] Sei onde cada `DECISAO`/`PORQUE` fica no código, pra abrir e mostrar ao vivo se pedirem
