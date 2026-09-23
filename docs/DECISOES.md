# Decisões técnicas — extração completa

Todo comentário `DECISAO`/`PORQUE` que existiu no código, back e front, organizado
por arquivo. Os comentários foram removidos do código-fonte (pra manter o código
limpo na hora de mostrar em entrevista) e centralizados aqui — cada entrada
referencia arquivo, linha (no código atual) e a construção (classe/método/campo/
função) a que se aplica.

Ver também: [`FEATURES.md`](../FEATURES.md) (o mesmo conteúdo, organizado por
**feature** em vez de por arquivo, com "o que pode perguntar" pra cada uma),
[README.md](../README.md) (resumo curado + como rodar),
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

### `cliente/Cliente.java:14` — classe `Cliente`
> **DECISAO:** saldo real vs. saldo disponível, dois campos separados — não
> um só.
> **PORQUE:** é a mesma distinção que uma conta bancária de verdade faz.
> Saldo REAL é o que a conta tem de fato, confirmado. Saldo DISPONÍVEL é o
> que sobra depois de descontar reservas em andamento (pagamentos que
> começaram mas ainda não confirmaram). Consulta de saldo/extrato mostra
> disponível (o cliente não pode gastar o que já está reservado por outro
> pagamento em andamento); saldo real só muda quando um pagamento REALMENTE
> se completa.

### `cliente/Cliente.java:29` — campo `version`
> **DECISAO:** `@Version` aqui também, mesmo motivo que em `Saga.java`.
> **PORQUE:** existe uma corrida real possível se duas sagas reservarem
> saldo do mesmo cliente ao mesmo tempo (duas linhas do
> `ContaSaldoListener` processando comandos concorrentes) — sem lock
> otimista, uma reserva pode sobrescrever a outra silenciosamente.

### `cliente/Cliente.java:41` — `reservar()`
> **DECISAO:** `SaldoInsuficienteException` é regra de negócio DENTRO da
> entidade, não um "if" solto no listener que chama.
> **PORQUE:** mesmo princípio de "tell, don't ask" já usado em
> `Saga.transicionarPara` — a entidade se protege, nunca fica com
> `saldoDisponivel` negativo por um chamador esquecer de checar antes.

### `cliente/Cliente.java:48` — `liberarReserva()`
> **DECISAO:** `liberarReserva` (compensação) só mexe no disponível, nunca
> no real.
> **PORQUE:** o real nunca foi debitado nessa reserva — só o disponível
> tinha sido descontado como "sinalização" de que esse dinheiro estava
> comprometido. Compensar é simplesmente desfazer esse sinalizador.

### `cliente/Cliente.java:52` — `confirmarDebito()`
> **DECISAO:** `confirmarDebito` só mexe no real, nunca no disponível.
> **PORQUE:** o disponível já tinha sido descontado no momento da RESERVA —
> confirmar o débito só torna permanente o que já estava sinalizado,
> atualizando o saldo real pra bater com o disponível.

### `cliente/Cliente.java:61` — `depositar()`
> **DECISAO:** depósito soma nos DOIS saldos (real e disponível), ao mesmo
> tempo.
> **PORQUE:** diferente de reservar/liberar/confirmar (que só mexem em UM
> saldo de cada vez, porque representam uma reserva em andamento), depósito
> é dinheiro entrando de verdade, sem nenhuma reserva envolvida — fica
> disponível pra gastar E já é real desde o primeiro instante, não existe
> uma "janela" intermediária como no pagamento.

### `cliente/ClienteConfig.java:14` — `ID_CLIENTE_DEMO`
> **DECISAO:** um único cliente demo, ID fixo e conhecido — não há tela de
> login/cadastro nesse case, só um usuário PJ simulado (o mesmo exibido no
> cabeçalho do front).

### `cliente/ClienteConfig.java:16` — `SALDO_INICIAL_DEMO`
> **DECISAO:** R$699,99, não um número redondo qualquer.
> **PORQUE:** preserva a regra determinística já documentada e testada
> (valor ≥ R$700 falha por saldo insuficiente) — só que agora é uma
> consequência REAL do saldo disponível, não mais uma constante solta no
> listener.

### `cliente/ClienteController.java:26` — `resetarSaldo()`
> **DECISAO:** endpoint de reset existe só pra demonstração repetível.
> **PORQUE:** saldo agora persiste de verdade entre pagamentos (RabbitMQ +
> Postgres, não reseta ao reiniciar o front) — sem isso, gravar o vídeo de
> demo duas vezes ou repetir na entrevista ao vivo exigiria reiniciar o
> banco inteiro. Mesmo espírito do `SimulacaoDelay`: existe só por causa da
> demonstração, não estaria numa API real de produção (reset de saldo de
> cliente nunca seria uma ação exposta livremente).

### `cliente/ClienteController.java:34` — `depositar()`
> **DECISAO:** "Autodepósito" — endpoint de demonstração pra colocar saldo
> na conta do cliente demo.
> **PORQUE:** pagamentos consomem saldo de verdade agora — sem um jeito de
> repor, o saldo demo (R$699,99) se esgota depois de poucos pagamentos
> bem-sucedidos e a demonstração trava. Numa aplicação real isso seria uma
> transferência/PIX recebido, não um endpoint que qualquer um chama —
> existe aqui só pelo mesmo motivo do reset de saldo: repetibilidade de
> demo.

### `saga/messaging/BoletoValidadoEvent.java:14` — métodos de fábrica `sucesso()`/`falha()`
> **DECISAO:** métodos de fábrica nomeados (sucesso/falha) em vez de deixar
> quem monta o evento chamar `new BoletoValidadoEvent(id, true, x, y, null)`
> direto.
> **PORQUE:** um construtor com 5 posições, incluindo um boolean solto e um
> null implícito, não deixa claro no ponto de chamada qual é o caminho
> feliz e qual é o de falha. `sucesso(...)`/`falha(...)` leem como frase.

### `saga/messaging/CompensarReservaCommand.java:6` — record
> **DECISAO:** carrega `valor`, não só `sagaId`.
> **PORQUE:** compensar precisa devolver a quantia exata que tinha sido
> reservada pro saldo disponível do cliente — o `ContaSaldoListener` não
> tem (nem deveria abrir) acesso à `Saga` pra descobrir esse valor por
> conta própria, ele só fala com filas.

### `saga/messaging/ContaSaldoListener.java:20` — classe
> **DECISAO:** reserva/compensação mexem no saldo DISPONÍVEL de verdade
> (`Cliente`, no Postgres), não mais num limiar fixo comparado contra o
> valor do boleto.
> **PORQUE:** o limiar antigo (≥R$700 falha) era uma simulação pura, sem
> estado nenhum por trás. Isso: (1) faz reserva/compensação terem efeito
> real e observável (`GET /cliente/saldo` muda de verdade); (2) preserva a
> mesma regra determinística de demonstração já documentada — o saldo
> inicial do cliente demo é R$699,99, então um boleto de R$700+ ainda falha
> por saldo insuficiente na primeira tentativa, só que agora é consequência
> real do saldo, não uma constante solta aqui.

### `saga/messaging/LiquidacaoListener.java:24` — `LIMITE_FALHA_LIQUIDACAO`
> **DECISAO:** só verifica o limiar de R$500 aqui, sem repetir o de R$700.
> **PORQUE:** um valor ≥ R$700 já teria sido barrado antes, na reserva de
> saldo — no fluxo normal, a saga nunca chega até aqui com esse valor. É
> uma simulação pro case, não uma validação defensiva de produção.
> Continua sendo uma falha de NEGÓCIO independente de saldo (ex: sistema de
> liquidação bancária rejeitou) — por isso não usa `Cliente` aqui, só no
> caminho de sucesso.

### `saga/messaging/LiquidacaoListener.java:55` — `confirmarDebito` no sucesso
> **DECISAO:** `confirmarDebito` (mexe no saldo REAL) só acontece aqui, no
> sucesso da liquidação — nunca na reserva.
> **PORQUE:** o saldo disponível já tinha sido descontado na reserva
> (sinalização); o saldo real só pode ser debitado quando o dinheiro de
> fato saiu, ou seja, quando a liquidação bancária confirma. Se a
> liquidação falhar, o real nunca chega a mudar — só o disponível, que a
> compensação devolve.

### `saga/messaging/SagaMessagingConfig.java:68` — bean `sagaQueues()`
> **DECISAO:** uma única `Declarables` montada a partir da lista de routing
> keys, em vez de um par de `@Bean` (fila + binding) copiado e colado 8 vezes.
> **PORQUE:** as 8 filas são estruturalmente idênticas (mesma config de dead
> letter, mesma exchange) — só muda o nome. Copiar o mesmo bloco 8 vezes
> vira 8 lugares pra atualizar se a config de DLQ mudar amanhã.

### `saga/messaging/SagaMessagingConfig.java:81` — listener de `ApplicationReadyEvent`
> **DECISAO:** forçar `amqpAdmin.initialize()` explicitamente quando a
> aplicação termina de subir.
> **PORQUE:** nesta versão (Spring Boot 4.1.1), verificamos na prática que o
> `RabbitAdmin` NÃO declara sozinho as filas/exchanges/bindings na
> inicialização — confirmado isolando o problema: os beans `Declarable`
> existem, mas nada chega no broker até chamarmos `initialize()`
> manualmente. Em vez de confiar nesse comportamento implícito, forçamos de
> forma explícita e documentada.

### `saga/messaging/SagaMessagingConfig.java:86` — bean `MessageConverter`
> **DECISAO:** `JacksonJsonMessageConverter` reaproveitando o `JsonMapper`
> que o Spring Boot já autoconfigura (injetado), em vez de criar um novo
> "cru".
> **PORQUE:** (1) mensagem em JSON legível na UI do RabbitMQ, em vez de
> bytes de serialização nativa do Java; (2) reaproveitar o `JsonMapper` do
> Spring evita qualquer divergência de configuração entre o que o resto da
> app usa pra JSON e o que a mensageria usa. NOTA: a partir do Jackson 3.x
> o pacote mudou de `com.fasterxml.jackson` para `tools.jackson`, e o
> Spring AMQP tem uma classe nova pra isso (`JacksonJsonMessageConverter`,
> sem o "2").

### `saga/messaging/SimulacaoDelay.java:3` — classe
> **DECISAO:** delay artificial centralizado, usado pelos listeners
> simulados.
> **PORQUE:** sem isso, o processamento é rápido demais (sub-segundo) pra
> ver a timeline se atualizando de verdade numa demonstração/vídeo — cada
> etapa fica com o mesmo timestamp, quase instantâneo. Só existe por causa
> disso; não é requisito de negócio, nem estaria aqui numa integração real.

### `saga/messaging/ValidacaoBoletoListener.java:16` — classe
> **DECISAO:** este listener simula o serviço "Validação de Boleto" dentro
> do mesmo processo Spring Boot, consumindo de uma fila de verdade, não
> chamado como método Java direto.
> **PORQUE:** o PDF permite/pede que o serviço externo seja mockado — mas o
> ponto do case é demonstrar mensageria assíncrona de verdade. Simular via
> fila mantém o desacoplamento real: o Orchestrator não sabe (nem deveria
> saber) que isso roda no mesmo processo.

### `saga/messaging/ValidacaoBoletoListener.java:32` — ordem publish/ack
> **DECISAO:** publica a resposta ANTES de confirmar (ack) a mensagem
> original.
> **PORQUE:** se o ack viesse primeiro e o `convertAndSend` falhasse
> depois, a mensagem original já teria sumido (confirmada) mas a resposta
> nunca teria sido publicada — perda silenciosa, sem como recuperar. Nessa
> ordem, se `convertAndSend` falhar, o catch ainda pode dar nack válido (a
> mensagem original nunca foi confirmada) e ela vai pra DLQ, onde pode ser
> investigada. (Mesma ordem replicada em `ContaSaldoListener` e
> `LiquidacaoListener`.)

### `saga/messaging/ValidacaoBoletoListener.java:40` — `processar()`
> **DECISAO:** regra determinística pelo final da linha digitável, não
> aleatória.
> **PORQUE:** pra demonstrar cada caminho da saga (feliz e de falha) de
> forma controlável e repetível no vídeo/entrevista — você escolhe o
> número, não depende de sorte.

### `saga/Saga.java:42` — campo `protocolo`
> **DECISAO:** nullable, só preenchido quando a saga chega em `CONCLUIDO`.
> **PORQUE:** protocolo só faz sentido pra um pagamento que realmente
> aconteceu — não existe "protocolo de tentativa" nesse domínio.

### `saga/Saga.java:51` — campo `version`
> **DECISAO:** campo `@Version` pra lock otimista.
> **PORQUE:** existe uma corrida real possível entre o `SagaOrchestrator`
> (reagindo a um evento chegando) e o `SagaTimeoutScheduler` (decidindo
> que essa saga está presa) tentando escrever no MESMO registro ao mesmo
> tempo, com decisões diferentes. Sem isso, quem salva por último vence
> silenciosamente, podendo sobrescrever um resultado real com um timeout
> falso (ou o contrário). Com `@Version`, o Hibernate controla um número de
> versão sozinho: se dois processos tentam salvar a partir da mesma
> versão, o segundo recebe `ObjectOptimisticLockingFailureException` em
> vez de sobrescrever sem avisar.

### `saga/Saga.java:53` — construtor `protected`
> **DECISAO:** construtor vazio `protected`, não `public`.
> **PORQUE:** o Hibernate exige um construtor sem argumentos pra conseguir
> instanciar a entidade via reflection ao ler do banco — mas ninguém no
> código deveria criar uma `Saga` "vazia" na mão, por isso `protected` em
> vez de `public`.

### `saga/Saga.java:66` — `transicionarPara()`
> **DECISAO:** `transicionarPara` em vez de um `setEstado(...)` público.
> **PORQUE:** um setter genérico deixaria qualquer chamador colocar a saga
> em QUALQUER estado, ignorando a máquina de estados testada.
> `transicionarPara` reusa `SagaState.podeTransicionarPara` pra se
> proteger — a entidade nunca fica num estado que a máquina não permite.

### `saga/SagaOrchestrator.java:30` — classe
> **DECISAO:** `SagaOrchestrator` mora em "saga" (domínio), não em
> "saga.messaging".
> **PORQUE:** ele é quem DECIDE o que fazer a seguir, não só transporta
> mensagem — mora mais perto de Saga/SagaState do que da infraestrutura
> pura de fila. Os listeners simulados ficam em `messaging` porque são
> adaptadores substituindo sistemas externos; o Orchestrator é o cérebro
> do próprio case.

### `saga/SagaOrchestrator.java:45` — `ResultadoIniciarSaga`
> **DECISAO:** registro devolvido pelo `iniciar()` diz se a saga é nova ou
> já existia.
> **PORQUE:** o controller REST precisa saber disso pra decidir o código
> HTTP certo — 202 (Accepted) numa criação de verdade, 200 (OK) num
> reenvio idempotente que só devolveu o que já existia.

### `saga/SagaOrchestrator.java:48` — `iniciar()`
> **DECISAO:** duas camadas de defesa contra idempotencyKey duplicada.
> **PORQUE:** (1) `findByIdempotencyKey` antes de criar cobre o caso comum
> (reenvio depois que a primeira saga já existe). (2) capturar
> `DataIntegrityViolationException` cobre a corrida real — duas
> requisições com a MESMA chave chegando ao mesmo tempo, as duas passando
> pelo `findBy` antes de qualquer uma salvar. Nesse caso a constraint
> UNIQUE do banco rejeita a segunda gravação; em vez de deixar isso virar
> um erro feio pro cliente, buscamos de novo e devolvemos a saga que
> "venceu" a corrida, como se fosse reenvio normal. LIMITAÇÃO CONHECIDA:
> salvar a saga e publicar o comando não são atômicos (são dois sistemas
> diferentes). Se o publish falhar depois do save, a saga fica presa em
> RECEBIDO até o timeout/scheduler (RNF03) detectar e reagir.

### `saga/SagaOrchestrator.java:69` — `salvarComHistorico()`
> **DECISAO:** helper único que sempre salva a saga E registra a transição
> no histórico, junto.
> **PORQUE:** evita esquecer de logar em algum dos vários pontos que mudam
> estado — o histórico existe especificamente pra alimentar a timeline do
> front (timestamp por etapa, e qual etapa estava em andamento quando a
> saga falhou), então toda gravação de saga precisa gerar uma linha.

### `saga/SagaOrchestrator.java:74` — `registrarTransicao()`
> **DECISAO:** separado de `salvarComHistorico()` especificamente pro caso
> da dupla transição (`SALDO_RESERVADO` → `LIQUIDACAO_ENVIADA`) em
> `aoReservarSaldo`, onde só existe UM save da saga (de propósito, pra não
> reabrir a janela de corrida já corrigida antes), mas a timeline do front
> precisa das DUAS linhas de histórico mesmo assim.
> **PORQUE:** não salva a saga de novo aqui — só registra que ela passou
> por esse estado, no instante em que passou.

### `saga/SagaOrchestrator.java:78` — `gerarProtocolo()`
> **DECISAO:** formato "ITU-" + 7 dígitos aleatórios, sem garantia formal
> de unicidade (sem constraint UNIQUE no banco).
> **PORQUE:** é só um número de referência pra exibição/suporte, não uma
> chave de negócio (quem identifica a saga de verdade é o sagaId/UUID) —
> colisão teoricamente possível, mas irrelevante pro escopo do case.

### `saga/SagaOrchestrator.java:115` — `aoReservarSaldo()` (dupla transição)
> **DECISAO:** as duas transições (`SALDO_RESERVADO` → `LIQUIDACAO_ENVIADA`)
> em memória, UM único save, e SÓ DEPOIS o publish.
> **PORQUE:** a versão anterior salvava `SALDO_RESERVADO`, publicava, e só
> depois salvava `LIQUIDACAO_ENVIADA` — deixando uma janela real onde, se
> a app caísse entre o publish (já enviado) e o segundo save, a resposta
> do `LiquidacaoListener` chegaria rápido e encontraria o estado
> desatualizado — o `podeProcessar` trataria essa resposta legítima como
> "fora de ordem" e descartaria, perdendo o resultado real da liquidação.
> Sem essa janela: ou o estado final já está salvo ANTES do publish (a
> resposta sempre encontra o estado certo), ou o publish falha e a saga
> fica presa em `LIQUIDACAO_ENVIADA` sem o comando ter saído de verdade —
> cenário seguro, que o scheduler de timeout sabe resolver reenviando o
> comando.

### `saga/SagaOrchestrator.java:179` — `podeProcessar()`
> **DECISAO:** guarda de idempotência baseada em ESTADO, não em chave.
> **PORQUE:** se um evento já foi processado antes (redelivery do
> RabbitMQ, at-least-once), a saga já vai estar num estado DIFERENTE do
> esperado — nesse caso só confirma (ack) sem reaplicar a transição, em
> vez de deixar `transicionarPara(...)` lançar exceção e mandar um evento
> duplicado, mas inofensivo, pra DLQ por engano.
> **DECISAO:** `saga == null` lança exceção (vai pra DLQ via o catch do
> listener); estado divergente só retorna `false` (ack, ignora em
> silêncio).
> **PORQUE:** são categorias diferentes de problema. Estado divergente é
> duplicata/reentrega esperada (at-least-once) — benigno, só ignorar.
> Saga nula é anomalia de verdade: nosso próprio sistema só cria um sagaId
> a partir de uma saga já salva, então um evento com sagaId inexistente
> indica algo genuinamente errado — merece ficar preservado na DLQ pra
> investigar.

### `saga/SagaRepository.java:14` — `findByEstadoInAndAtualizadoEmBefore`
> **DECISAO:** query derivada composta (`In` + `Before`) em vez de `@Query`
> com JPQL.
> **PORQUE:** o Spring Data consegue montar a query só pelo nome do método
> até um certo ponto de complexidade — "estado está numa lista E
> atualizadoEm é anterior a X" ainda cabe nisso. Só partiria pra `@Query`
> se a condição ficasse mais complexa que isso.

### `saga/SagaRepository.java:16` — `findFirstByLinhaDigitavelAndEstadoNotInOrderByCriadoEmDesc`
> **DECISAO:** `findFirst` + `OrderBy`, não `findAll`.
> **PORQUE:** só precisamos saber SE existe uma saga bloqueante pra esse
> número de boleto, e qual — não a lista inteira. `OrderBy criadoEm desc`
> garante que, no caso raro de mais de uma bater no filtro, pegamos a mais
> recente.

### `saga/SagaState.java:35` — `ESTADOS_QUE_NAO_BLOQUEIAM_NOVO_PAGAMENTO`
> **DECISAO:** estados que NÃO bloqueiam um novo pagamento pro MESMO
> número de boleto (mesma `linhaDigitavel`).
> **PORQUE:** `REJEITADO` e `FALHOU` são terminais sem chance de sucesso —
> pagar de novo é legítimo. `SALDO_LIBERADO` também entra aqui apesar de
> NÃO ser terminal: é o estado de compensação em andamento, que só pode
> desaguar em `REJEITADO` ou `FALHOU` (nunca em `CONCLUIDO`) — bloquear um
> novo pagamento nesse ponto só atrasaria uma tentativa que de qualquer
> forma vai ser liberada segundos depois. Todo o resto (`RECEBIDO`,
> `VALIDADO`, `SALDO_RESERVADO`, `LIQUIDACAO_ENVIADA`, `CONCLUIDO`)
> bloqueia: ou já pagou, ou ainda pode vir a pagar.

### `saga/SagaTimeoutScheduler.java:18` — classe
> **DECISAO:** classe separada de `SagaOrchestrator`.
> **PORQUE:** o Orchestrator reage a EVENTOS (o que aconteceu); esse
> scheduler reage à PASSAGEM DE TEMPO (o que não aconteceu). São dois
> gatilhos diferentes de mudança de estado — cada classe fica com uma
> responsabilidade só.

### `saga/SagaTimeoutScheduler.java:48` — catch `OptimisticLockingFailureException`
> **DECISAO:** capturar essa exceção especificamente e só logar, sem
> propagar.
> **PORQUE:** significa que a saga mudou de estado entre a consulta e o
> save — o `SagaOrchestrator` processou um evento real bem nessa janela (a
> corrida que o `@Version` existe pra proteger). Não é erro do sistema, é
> o timeout chegando tarde demais — a saga já não precisa mais dele.

### `saga/SagaTransicao.java:15` — classe
> **DECISAO:** log append-only, sem `estadoAnterior` armazenado.
> **PORQUE:** cada linha é só "essa saga esteve nesse estado, nesse
> instante" — o estado anterior é derivável olhando a linha
> cronologicamente anterior pra mesma sagaId, não precisa duplicar o dado.
> Existe só pra alimentar a timeline do front — não é a entidade `Saga`
> principal, que continua guardando só o estado ATUAL.

### `saga/web/BoletoPreviewResponse.java:9` — record
> **DECISAO:** `sagaExistente`/`estadoSagaExistente` entram no MESMO DTO
> de preview, não um endpoint separado de "verificar duplicidade".
> **PORQUE:** o front já chama esse endpoint a cada linha digitável válida
> (`useBoletoPreview`) — anexar essa informação aqui evita uma segunda
> chamada de rede só pra essa checagem, no mesmo espírito de "trazer tudo
> que a tela precisa numa chamada só" já usado em `PagamentoResponse`.

### `saga/web/ConsultaBoletoService.java:15` — classe
> **DECISAO:** consulta de boleto (RF03) é síncrona, sem passar pelo
> RabbitMQ.
> **PORQUE:** é uma leitura, não uma ação que muda estado — não precisa da
> garantia de mensageria assíncrona que o pagamento em si precisa. O
> cliente precisa da resposta na hora pra montar a tela de revisão.

### `saga/web/ConsultaBoletoService.java:32` — `consultar()`
> **DECISAO:** checa duplicidade pelo mesmo número de boleto
> (`linhaDigitavel`), não pela Idempotency-Key.
> **PORQUE:** Idempotency-Key protege contra reenvio ACIDENTAL da MESMA
> tentativa (mesma instância do formulário) — mas não impede o usuário
> digitar de propósito, numa aba/tentativa nova (chave nova), um boleto
> que JÁ foi pago ou que já tem um pagamento em andamento. Essa é uma
> regra de negócio diferente: "documento já pago/em processamento não
> pode ser pago de novo", verificada pelo dado do boleto em si, não pelo
> mecanismo de idempotência de requisição.

### `saga/web/ConsultaBoletoService.java:61` — `extrairValor()`
> **DECISAO:** posição do campo de valor depende do FORMATO (tamanho), não
> é sempre "os últimos 10 dígitos".
> **PORQUE:** bug real encontrado (relatado com um número de teste real de
> código de barras) — só o BOLETO BANCÁRIO (47 dígitos) tem o valor no
> final (Campo5 = vencimento(4)+valor(10), últimas 14 posições). No
> CÓDIGO DE BARRAS (44 dígitos), o layout é
> banco(3)+moeda(1)+DV(1)+vencimento(4)+valor(10)+campo-livre(25) — o
> valor fica nas posições 9-19, e os últimos 10 dígitos pertencem ao campo
> livre, não ao valor. Pegar "últimos 10 dígitos" às cegas devolvia um
> número gigante e errado pro código de barras, divergindo do que o front
> já calculava certo localmente (`extrairValorLocal` em
> `boletoValidator.ts`) — os dois agora usam exatamente a mesma posição
> por formato.

### `saga/web/PagamentoController.java:42` — `criar()`
> **DECISAO:** 202 (Accepted) quando cria de verdade, 200 (OK) quando só
> devolve uma saga que já existia (reenvio idempotente).
> **PORQUE:** 202 comunica "aceitei, vou processar de forma assíncrona" —
> não faz sentido usar o mesmo código pra "aceitei" e "já tinha aceitado
> antes", são situações diferentes que o cliente pode querer distinguir.

### `saga/web/PagamentoController.java:52` — `listar()`
> **DECISAO:** `Page<T>` do Spring Data direto, sem DTO de envelope
> próprio.
> **PORQUE:** `Page` já serializa com
> `content`/`totalElements`/`totalPages`/`number` — exatamente o que a
> paginação do front precisa, sem reinventar o formato.

### `saga/web/PagamentoResponse.java:13` — record
> **DECISAO:** DTO separado da entidade `Saga`, não a entidade devolvida
> direto.
> **PORQUE:** a entidade carrega detalhe de persistência (`@Version`, por
> exemplo) que não é assunto da API. Desacoplar o contrato HTTP do formato
> do banco significa que um pode mudar sem quebrar o outro.
> **DECISAO:** `beneficiario`/`valor`/`vencimento`/`linhaDigitavel` entram
> aqui, não só estado/histórico.
> **PORQUE:** o `PaymentStatusTracker` (front) precisa mostrar DE QUAL
> boleto se trata, tanto no acompanhamento ao vivo quanto ao abrir um item
> do histórico. `banco`/`tipo` NÃO entram de propósito: são derivados só
> da `linhaDigitavel`, e o front já tem essa lógica pronta — reexpor no
> backend seria duplicar a mesma regra em dois lugares.

### `saga/web/PagamentoResponse.java:17` — `HistoricoEntry`
> **DECISAO:** histórico embutido na mesma resposta, não um endpoint
> separado.
> **PORQUE:** o front faz polling nesse endpoint repetidamente — trazer
> tudo que a timeline precisa numa chamada só evita orquestrar duas
> requisições por tick de polling.

### `saga/web/WebConfig.java:11` — `addCorsMappings()`
> **DECISAO:** libera explicitamente só a origem do Vite em
> desenvolvimento (`localhost:5173`), não um wildcard "*".
> **PORQUE:** front e back são serviços separados por decisão
> arquitetural desde o início do projeto (não um monolito) — CORS precisa
> existir de verdade, com allowlist explícita, não só silenciado com "*"
> pra fazer funcionar.

---

## Frontend

### `validation/mod10.ts:1` — `calcularMod10()`
> **DECISAO:** Mod10 puro, sem nenhuma dependência de React.
> **PORQUE:** é um algoritmo, não um componente — testável isoladamente,
> reutilizável em qualquer lugar que precise validar um campo.

### `validation/mod11.ts:13` — regra 0/1/10→1
> **DECISAO:** 0, 1 ou 10 viram 1.
> **PORQUE:** é a regra específica do DV geral de boleto (Mod11) — esses
> três resultados não são dígitos verificadores válidos nesse contexto.

### `validation/boletoValidator.ts:28` — `detectarFormato()`
> **DECISAO:** retorno é um union type de strings literais, não boolean
> nem string livre.
> **PORQUE:** esse valor vai virar branching de lógica (qual validação
> rodar depois), então o compilador precisa conhecer os 4 casos possíveis
> — não só exibição pro usuário.

### `validation/boletoValidator.ts:41` — `validarLinhaDigitavel()`
> **DECISAO:** valida "só dígitos" acontece na borda (sanitização), não
> aqui.
> **PORQUE:** evitar checagem duplicada — a função de domínio confia no
> contrato de que só recebe string já sanitizada, mesmo padrão usado pro
> backend.

### `validation/boletoValidator.ts:109` — `mascararLinhaDigitavel()`
> **DECISAO:** máscara aplicada sobre o valor JÁ sanitizado (só dígitos),
> nunca sobre o que o usuário digitou na hora — o input sempre
> guarda/valida dígito puro (`useBoletoValidation`), a máscara é só uma
> camada de apresentação.
> **PORQUE:** separar "o dado" de "como ele aparece" evita que pontuação
> de máscara vaze pra dentro da lógica de validação/envio.

### `validation/boletoValidator.ts:130` — `mascararBoletoBancario()`
> **DECISAO:** máscara do boleto bancário segue os limites de campo da
> FEBRABAN (Campo1 10, Campo2 11, Campo3 11, Campo4 1, Campo5 14), com "."
> separando os 5 primeiros dígitos do DV de cada campo — mesmo agrupamento
> impresso no boleto de verdade.

### `validation/boletoValidator.ts:155` — `extrairValorLocal()`
> **DECISAO:** extrai o valor só quando o FORMATO já é conhecido (length
> exato de 44 ou 47), independente do DV estar certo ainda.
> **PORQUE:** formato/posição dos campos é uma propriedade ESTRUTURAL (só
> depende do tamanho), não da validade do dígito verificador — mostrar o
> valor reativamente, só-cliente, mesmo com uma linha ainda com DV errado
> (ou nem checado ainda) ajuda o usuário a perceber um erro de
> transcrição olhando pro valor que "não bate" com o que ele esperava, sem
> esperar nem terminar de digitar nem uma chamada de rede.
> **DECISAO:** convênio (48 dígitos) reconstrói o código de barras (4
> blocos de 11, DV de bloco removido) e só extrai o valor quando o dígito
> identificador (posição 3) é "6" ou "8" — efetivo em reais. "7"/"9"
> (quantidade de moeda ou valor de referência a reajustar) devolve `null`.
> **PORQUE:** extrair um número desses dois últimos campos como se fosse
> reais mostraria um valor tecnicamente presente na linha mas
> semanticamente errado — pior que não mostrar nada.

### `validation/mod11.ts:18` — `calcularMod11Convenio()`
> **DECISAO:** função separada de `calcularMod11`, não um parâmetro extra
> na existente.
> **PORQUE:** convênio (Layout FEBRABAN de Arrecadação v08) usa a MESMA
> soma ponderada (pesos 2-9 ciclando) mas uma regra de arredondamento
> diferente — checa o RESTO direto (resto 0 ou 1 → DV 0, resto 10 → DV 1,
> senão DV = 11-resto), enquanto cobrança/boleto bancário checa o DV JÁ
> calculado (`11-resto`). Confirmado contra os exemplos numéricos do
> próprio PDF da FEBRABAN antes de escrever qualquer código.

### `validation/boletoValidator.ts:124` — `validarConvenio()`
> **DECISAO:** convênio (48 dígitos) valida DV de verdade — 4 blocos de
> 12 (11 de conteúdo + 1 DV de bloco), reconstrução do código de barras de
> 44 dígitos concatenando os 4 conteúdos, e DV geral igual ao de código de
> barras (posição 4, calculado sobre o resto).
> **PORQUE:** o dígito identificador (posição 3, dentro do código de
> barras reconstruído) escolhe o módulo — "6"/"7" usa Mod10
> (`calcularMod10`, já existente), "8"/"9" usa Mod11 de convênio
> (`calcularMod11Convenio`, regra própria). Todos os 4 blocos usam o MESMO
> módulo do DV geral — não é possível saber qual módulo usar sem antes
> reconstruir e ler essa posição.

### `validation/bancos.ts:1` — `BANCOS`
> **DECISAO:** `Record<string, string>`, não um TS `enum`.
> **PORQUE:** as chaves são códigos com zero à esquerda ("001", "033") —
> um enum não aceita chave começando com dígito, e um enum numérico
> perderia o zero à esquerda (001 vira 1). `Record` é a mesma ideia de
> tabela de consulta (mesmo padrão já usado em `MENSAGENS_POR_MOTIVO`), só
> que com chave string livre. Espelha `BANCOS` em
> `ConsultaBoletoService.java` (backend) — duplicado de propósito, um só
> pra exibição reativa no client antes do GET confirmar.

### `validation/bancos.ts:10` — `detectarBanco()`
> **DECISAO:** os 3 primeiros dígitos são o código do banco emissor em
> QUALQUER dos 3 formatos (código de barras, boleto bancário, convênio) —
> é a mesma posição porque a linha digitável é só uma reordenação do
> código de barras, e o código de barras começa com banco(3) + moeda(1) +
> DV(1) + ...

### `hooks/useBoletoValidation.ts:7` — `alterarLinhaDigitavel()`
> **DECISAO:** sanitização (remover pontuação) acontece aqui, no setter,
> única borda de entrada.
> **PORQUE:** garante que o estado interno do hook — e tudo que consome
> ele depois — sempre trabalha com dígito puro, sem repetir a limpeza em
> cada consumidor.
> **DECISAO:** truncado em `TAMANHO_MAXIMO_LINHA_DIGITAVEL` aqui, não só
> no `maxLength` do input.
> **PORQUE:** o `<input>` exibe o valor MASCARADO (com pontos/espaços),
> então o `maxLength` nativo do DOM contaria caractere de máscara, não
> dígito — o limite de verdade precisa ser garantido no dado, não na
> apresentação.

### `components/BoletoInput.tsx:32` — `mensagemErro`
> **DECISAO:** `resultado.motivo` é nullable, mas `MENSAGENS_POR_MOTIVO`
> só tem chave pros motivos de erro de verdade — precisa da guarda antes
> de indexar o mapa, senão o TypeScript reclama.

### `components/BoletoInput.tsx:37` — prévia local
> **DECISAO:** prévia local inteira (banco, tipo, valor) é derivada só do
> dado já digitado, sem nenhuma chamada de rede — não espera nem a linha
> estar completa, nem o DV estar correto, nem o GET de preview responder.
> **PORQUE:** banco/tipo/valor são propriedades ESTRUTURAIS da linha
> digitável (posição fixa por formato, especificação FEBRABAN) — dado que
> o próprio navegador já tem em mãos, não precisa perguntar pro backend.
> Só o beneficiário fica de fora dessa prévia: é dado simulado que só o
> backend "conhece", não está codificado na linha de forma nenhuma.

### `components/BoletoInput.tsx:55` — input mascarado
> **DECISAO:** input controlado exibe o valor MASCARADO, mas o `onChange`
> extrai dígito puro do que veio do DOM antes de repassar pro hook.
> **PORQUE:** máscara é só apresentação — o dado que trafega sempre foi e
> continua sendo dígito puro. LIMITAÇÃO CONHECIDA: como o valor exibido
> muda de tamanho a cada tecla, o cursor pula pro fim do campo a cada
> digitação — aceitável porque o padrão de uso real é digitar/colar
> sequencialmente do início ao fim, raramente editar no meio.

### `hooks/useBoletoPreview.ts:13` — tipo `BoletoPreview`
> **DECISAO:** `sagaExistente`/`estadoSagaExistente` vem no mesmo preview,
> não numa chamada separada de "verificar duplicidade".
> **PORQUE:** espelha o DTO do backend — o back já anexa isso na MESMA
> consulta que o front já fazia a cada linha válida, sem round-trip extra.

### `hooks/useBoletoPreview.ts:34` — parse do fetch
> **DECISAO:** parseia o JSON independente do status HTTP (não checa
> `res.ok`).
> **PORQUE:** o backend devolve 404 com corpo válido quando não encontra
> (`encontrado:false` + `motivoFalha`) — isso é uma resposta de domínio,
> não um erro de rede. `fetch` só lança exceção em falha real (rede fora
> do ar, CORS bloqueado) ou se o JSON vier corrompido.

### `components/PaymentReviewCard.tsx:8` — props opcionais
> **DECISAO:** `rotuloBotao`/`mensagemBloqueio` opcionais, com default pro
> caminho comum (pagamento novo).
> **PORQUE:** o card não decide SE o boleto já foi pago — só exibe o que a
> página manda, mantendo a regra de negócio (quais estados bloqueiam) num
> lugar só (PagamentoPage/backend), não duplicada aqui dentro.

### `components/PaymentReviewCard.tsx:57` — `formatarData()`
> **DECISAO:** constrói a Date a partir de ano/mês/dia separados, não de
> `new Date(dataIsoCompleta)`.
> **PORQUE:** `new Date("2026-10-15")` é interpretado como meia-noite UTC —
> ao formatar de volta no fuso local (Brasil, UTC-3), a data pode "voltar"
> um dia. Construir com (ano, mês-1, dia) usa meia-noite LOCAL, evitando o
> bug.

### `components/PaymentStatusTracker.tsx:8` — tipo `DadosBoleto`
> **DECISAO:** campos nullable (não um objeto opcional só por dentro).
> **PORQUE:** `beneficiario`/`vencimento` só vem preenchido depois que a
> etapa de validação terminar — mostrar "—" enquanto ainda não chegou é
> melhor que esconder o card inteiro.

### `components/PaymentStatusTracker.tsx:20` — prop `boleto`
> **DECISAO:** opcional, não obrigatório.
> **PORQUE:** evita forçar todo teste/consumidor existente a passar esse
> dado — sem ele, o card de resumo do boleto simplesmente não aparece, o
> resto do componente funciona igual antes.

### `components/PaymentStatusTracker.tsx:26` — early return
> **DECISAO:** sem pagamento em andamento (estado null), não renderiza
> nada.
> **PORQUE:** essa tela só faz sentido depois que o usuário confirmou um
> pagamento — `montarTimeline` já devolve `[]` nesse caso.

### `components/PaymentStatusTracker.tsx:35` — resumo do boleto
> **DECISAO:** resumo do boleto entra AQUI, dentro do tracker — não num
> componente separado ao lado.
> **PORQUE:** pedido explícito — sem isso, tanto o acompanhamento ao vivo
> quanto a consulta de um item do histórico mostram só a timeline de
> estados, sem dizer DE QUAL boleto se trata. Reusa
> `detectarBanco`/`detectarFormato` (mesma lógica já usada no
> `BoletoInput`) em vez de esperar o backend mandar banco/tipo prontos.

### `timeline/montarTimeline.ts:39` — loop
> **DECISAO:** loop imperativo (`for`) em vez de `.map` com flag externa.
> **PORQUE:** a regra depende de um "gap ainda não encontrado" que
> precisa persistir entre iterações — um `for` deixa essa dependência
> sequencial explícita, em vez de escrever um `.map` com efeito colateral
> escondido.

### `timeline/montarTimeline.ts:105` — timestamp da linha de falha
> **DECISAO:** busca o timestamp de `estadoAtual` (`REJEITADO` ou
> `FALHOU`) no histórico, igual o ramo de sucesso já fazia pra
> `CONCLUIDO`.
> **PORQUE:** bug real — estava hardcoded como `null`, então a linha final
> de falha nunca mostrava horário nenhum, mesmo `FALHOU`/`REJEITADO`
> sendo um estado com sua própria linha no histórico, com timestamp de
> verdade.

### `hooks/usePaymentSaga.ts:46` — `falhou`
> **DECISAO:** `falhou` é derivado aqui, não recalculado na UI.
> **PORQUE:** "quais estados são falha terminal" é conhecimento de
> domínio — mora perto do `SagaState`, não duplicado em cada componente
> que precisa decidir se mostra o botão "Tentar Novamente".

### `hooks/usePaymentSaga.ts:75` — `reiniciar()`
> **DECISAO:** `reiniciar` troca a idempotency key, não reusa a antiga.
> **PORQUE:** a saga anterior terminou num estado terminal
> (`REJEITADO`/`FALHOU`), sem transição de volta — reenviar com a MESMA
> chave só devolveria a saga morta de novo (idempotência == mesma decisão
> pra sempre). "Tentar Novamente" é uma tentativa NOVA e deliberada (o
> clique), não um reenvio acidental — por isso merece chave própria.

### `hooks/usePaymentSaga.ts:104` — catch do polling
> **DECISAO:** falha pontual de rede só loga, não para o polling nem seta
> erro.
> **PORQUE:** um hiccup de rede no meio do polling não deveria derrubar a
> tentativa inteira — a próxima iteração do intervalo tenta de novo.

### `hooks/usePaymentDetalhe.ts:20` — hook separado
> **DECISAO:** hook separado de `usePaymentSaga`, não reaproveitado
> direto.
> **PORQUE:** `usePaymentSaga` também gerencia o ENVIO de um pagamento
> novo (idempotency key, `enviarPagamento`, `reiniciar`) — esse aqui só
> CONSULTA um sagaId que já existe, vindo do histórico. Misturar os dois
> infla o hook original com estado que essa tela nunca usa — mesmo
> princípio de `SagaOrchestrator` vs `SagaTimeoutScheduler`.

### `hooks/usePaymentDetalhe.ts:38` — polling condicional
> **DECISAO:** só entra em polling se a primeira consulta vier NÃO
> terminal.
> **PORQUE:** a maioria dos itens de histórico já está num estado
> terminal (pagamento passado) — poucos vão precisar de acompanhamento ao
> vivo, e nesses raros casos (pagamento ainda em andamento, clicado no
> histórico logo após enviar) o polling entra automaticamente.

### `hooks/usePaymentHistory.ts:20` — hook
> **DECISAO:** mesmo padrão do `useBoletoPreview` — `useEffect` +
> `AbortController`.
> **PORQUE:** trocar de página rápido (próximo/anterior várias vezes) tem
> o mesmo risco de condição de corrida — resposta antiga chegando depois
> da mais nova e sobrescrevendo o estado com a página errada.

### `pages/HistoricoPage.tsx:56` — item como `<Link>`
> **DECISAO:** o item inteiro é um `<Link>`, não só um `onClick` no
> `<li>`.
> **PORQUE:** navegação por link (com `<a>` de verdade por baixo, via
> react-router) dá suporte nativo a "abrir em nova aba"/"copiar link" e
> funciona sem JS. É troca de rota, continua SPA (react-router intercepta
> o clique, nunca recarrega a página).

### `pages/HistoricoPage.tsx:80` — `Categoria`
> **DECISAO:** categoria (concluído/falhou/andamento) é um mapeamento
> novo, não reaproveita `StatusLinha` de `timeline/montarTimeline.ts`.
> **PORQUE:** `StatusLinha` é sobre a POSIÇÃO de uma etapa na timeline;
> aqui é sobre o DESFECHO do pagamento inteiro, só 3 categorias — conceito
> de domínio diferente, mesmo parecendo similar.

### `pages/HistoricoDetalhePage.tsx:6` — recebe `sagaId` por prop
> **DECISAO:** recebe `sagaId` por PROP, não mais por `useParams()` de
> rota.
> **PORQUE:** essa tela agora é renderizada dentro da `HomePage`
> (`view=historico&saga=...`), não numa rota própria — o sagaId já vem
> lido do query param um nível acima, no componente pai.

### `pages/HistoricoDetalhePage.tsx:10` — reaproveita stylesheet
> **DECISAO:** reaproveita `PagamentoPage.module.scss`, não cria um
> arquivo de estilo próprio — é visualmente a MESMA tela de
> acompanhamento.

### `App.tsx:5` — `App()`
> **DECISAO:** uma única rota (`/`) — as outras telas não são mais
> páginas próprias, viraram seções que a `HomePage` renderiza
> condicionalmente por query param. O catch-all redireciona qualquer
> caminho antigo de volta pra raiz, em vez de dar tela em branco/404.

### `pages/HomePage.tsx:10` — `HomePage()`
> **DECISAO:** página única — os 3 cards ficam sempre visíveis, o
> conteúdo abaixo troca via query param (`?view=...`), não via rota
> separada.
> **PORQUE:** pedido explícito de navegação "full SPA" sem sair da tela.
> Query param em vez de `useState` local: mantém back/forward do
> navegador funcionando, e a URL continua compartilhável/atualizável, sem
> precisar de rotas de caminho separadas.

### `hooks/useSaldo.ts:15` — `consultar()` manual
> **DECISAO:** `consultar()` é disparado manualmente (`onMouseEnter` no
> `Layout`), não automático num `useEffect` ao montar.
> **PORQUE:** `Layout` monta uma única vez e persiste entre páginas — se
> buscasse só ao montar, o saldo ficaria desatualizado depois de um
> pagamento mudar ele de verdade. Buscar a cada hover mantém o valor
> exibido sempre fresco, sem precisar de polling constante em segundo
> plano.

### `hooks/useSaldo.ts:26` — validação do shape da resposta
> **DECISAO:** valida que os campos numéricos vieram de verdade antes de
> aceitar a resposta, não confia só no status HTTP 200.
> **PORQUE:** é a causa raiz de um bug real que vimos ao vivo — back
> desatualizado/endpoint errado pode devolver 200 com um corpo sem os
> campos esperados, e `Intl.NumberFormat().format(undefined)` formata
> silenciosamente como "R$ NaN" em vez de avisar de erro.

### `pages/AutodepositoPage.tsx:7` — sem botão de voltar
> **DECISAO:** renderizada dentro da `HomePage` (`?view=autodeposito`),
> não rota própria — por isso sem botão de voltar: os 3 cards continuam
> visíveis acima, trocar de visão é só clicar em outro card.

### `pages/AutodepositoPage.tsx:8` — estado em centavos
> **DECISAO:** estado guarda só dígitos, interpretados como CENTAVOS —
> não a string formatada digitada.
> **PORQUE:** mesmo padrão de máscara usado em app bancário de verdade
> (digita da direita pra esquerda): "2" → R$0,02, "20" → R$0,20, "2000" →
> R$20,00 — cada tecla nova empurra os dígitos existentes uma casa pra
> esquerda. Evita todo o problema de "onde fica a vírgula" que uma
> máscara de texto livre tem quando o usuário edita no meio ou apaga um
> dígito.

### `components/Layout.tsx:10` — `Layout()`
> **DECISAO:** `Layout` fica em `components/`, não em `pages/` — é usado
> por TODAS as páginas, não é uma tela em si.

### `components/LeitorCodigoBarras.tsx:12` — `HINTS`
> **DECISAO:** aceita ITF (o símbolo real do código de barras de boleto) E
> QR_CODE, não só ITF.
> **PORQUE:** ITF é o formato 1D mais difícil de decodificar via webcam
> (barras finas, sem separador visual, muito sensível a foco/ângulo/
> resolução) — limitação conhecida de leitores em JS, não um bug
> específico daqui. QR entra como alternativa PRÁTICA: dá pra gerar um QR
> code com os mesmos dígitos e testar/demonstrar a leitura de forma
> confiável, sem depender de imprimir um boleto de verdade em papel numa
> distância/ângulo perfeitos.

### `components/LeitorCodigoBarras.tsx:15` — componente
> **DECISAO:** componente separado, ativado por botão explícito — nunca
> abre a câmera sozinho.
> **PORQUE:** acesso à câmera exige permissão do navegador (pode ser
> negada, pode não existir câmera) e só funciona com HTTPS/localhost — é
> um método de entrada ADICIONAL ao campo de texto, nunca uma dependência.

### `components/LeitorCodigoBarras.tsx:18` — contador de tentativas
> **DECISAO:** contador de tentativas exibido na tela, não só log de
> console.
> **PORQUE:** sem isso, "não encontrou ainda" é indistinguível de
> "trava/não está fazendo nada" pra quem está testando — feedback visual
> confirma que o loop de leitura está rodando de verdade.

### `components/LeitorCodigoBarras.tsx:41` — tamanhos aceitos
> **DECISAO:** aceita 44/47/48 dígitos (os 3 formatos que
> `validarLinhaDigitavel` já sabe reconhecer), não só 44.
> **PORQUE:** uma leitura parcial/ruidosa pode decodificar um número de
> tamanho errado — descartar silenciosamente e deixar a câmera continuar
> tentando é melhor que propagar lixo pro formulário. Não trava em "só
> código de barras" porque o QR de teste pode carregar qualquer um dos 3
> formatos.

### `pages/PagamentoPage.tsx:12` — `React.lazy`
> **DECISAO:** import dinâmico (code-splitting), não import estático no
> topo.
> **PORQUE:** `@zxing/library` sozinha adiciona ~500KB ao bundle
> principal — custo pago por TODO usuário, mesmo quem nunca clica em
> "Escanear". Com `React.lazy`, esse pedaço só é baixado no momento em que
> o botão é clicado.

### `pages/PagamentoPage.tsx:33` — `tentarNovamente()`
> **DECISAO:** "Tentar Novamente" reinicia a saga (chave nova) e reenvia o
> MESMO boleto/valor que já estavam em mãos — não pede pro usuário digitar
> de novo.
> **PORQUE:** é a mesma intenção (pagar esse boleto), só uma tentativa
> nova.

### `pages/PagamentoPage.tsx:40` — `novoPagamento()`
> **DECISAO:** "Novo Pagamento" reseta tudo — saga E o campo de entrada.
> **PORQUE:** diferente de "Tentar Novamente", aqui a intenção mudou
> (outro boleto, ou só recomeçar do zero) — não faz sentido manter a
> linha digitável antiga preenchida.

### `pages/PagamentoPage.tsx:45` — troca de tela
> **DECISAO:** `sagaId` existe → mostra só o tracker; senão → input +
> revisão.
> **PORQUE:** é a mesma troca de tela que o Figma mostra — depois de
> enviar, o formulário de entrada sai de cena, só o acompanhamento fica
> visível.

### `pages/PagamentoPage.tsx:102` — aviso de "não encontrado"
> **DECISAO:** mensagem de "não encontrado" explícita, não só o card
> sumindo em silêncio.
> **PORQUE:** bug real reportado — linha válida (DV batendo) mas terminando
> em "0000" (regra determinística de "boleto não encontrado" simulada no
> backend) fazia o card de revisão sumir sem nenhuma explicação —
> `preview.motivoFalha` já existia no hook, só nunca era renderizado em
> lugar nenhum.

### `pages/PagamentoPage.tsx:113` — `aoConfirmar` com bloqueio
> **DECISAO:** se já existe uma saga bloqueante pra esse número de
> boleto, o botão NAVEGA pro acompanhamento dela em vez de criar um
> pagamento novo.
> **PORQUE:** idempotency-key só protege contra reenvio acidental da
> MESMA tentativa — não impede o usuário digitar de propósito, numa
> tentativa nova, um documento que já foi pago ou que ainda pode vir a
> ser pago. Reaproveita a mesma seção/visão que o histórico já usa
> (`?view=historico&saga=...` + `PaymentStatusTracker`).
