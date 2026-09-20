# Conceitos — banco de revisão

Este arquivo registra, em ordem cronológica, cada conceito novo explicado ou dúvida
respondida ao longo do desenvolvimento — a partir do momento em que o João pediu
esse registro. No fim do projeto, vira material pra uma bateria de perguntas estilo
entrevista rigorosa, testando se o conteúdo realmente ficou.

Formato de cada entrada: **conceito** · onde apareceu no projeto · o que foi dito.

---

## Enum em Java vs TypeScript

**Onde apareceu:** criando `SagaState.java`, antes de escrever os 8 estados da saga.

Em TypeScript, um `enum` compila para um objeto JS com mapeamento chave/valor — é
basicamente açúcar sintático. Em Java, um enum é uma **classe de verdade**: pode ter
campos, construtor e métodos, e cada constante pode ter comportamento próprio. Isso
foi usado como justificativa de design: em vez de espalhar a regra "de qual estado
posso ir pra qual" em `if`s no orquestrador, essa regra vai morar **dentro do próprio
enum `SagaState`** — a máquina de estados encapsulada onde ela pertence, testável sem
depender de banco, fila ou HTTP.

## Os 8 estados da Saga

**Onde apareceu:** definição de `SagaState.java`.

`RECEBIDO`, `VALIDADO`, `SALDO_RESERVADO`, `LIQUIDACAO_ENVIADA`, `CONCLUIDO` (fluxo
feliz) + `SALDO_LIBERADO`, `REJEITADO`, `FALHOU` (fluxo de compensação).
`SALDO_LIBERADO` não é nem sucesso nem falha — é o estado **transitório** de quando a
compensação está devolvendo o saldo reservado, antes de pousar em `REJEITADO` (falhou
cedo, antes de reservar) ou `FALHOU` (falhou depois de reservar/tentar liquidar).

## Por que a regra de transição mora no enum (e não no Orchestrator ou numa classe à parte)

**Onde apareceu:** decisão de design antes de implementar `podeTransicionarPara` em `SagaState.java`.

Comparado com as alternativas (regra na entidade `Saga`, numa classe `SagaTransitionRules`
separada, ou espalhada em `if`s no `SagaOrchestrator`), colocar a regra dentro do
próprio enum ganha por: (1) **coesão** — estado e regra sobre o estado são o mesmo
conceito; (2) evita que uma transição inválida passe despercebida por esquecimento de
checagem em algum ponto do código; (3) **testável sem infraestrutura** — dá pra testar
a regra pura, sem Spring/banco/fila; (4) **fonte única da verdade**, sem risco de duas
cópias da mesma regra divergirem. Limite reconhecido: essa escolha só funciona bem
porque a máquina é pequena e fixa (8 estados, definidos pelo PDF). Se um dia a regra
precisasse ser configurável em runtime (ex: tela admin editando transições), um enum
hard-coded em tempo de compilação viraria uma limitação, não uma vantagem — nesse
cenário a resposta certa seria uma tabela no banco.
