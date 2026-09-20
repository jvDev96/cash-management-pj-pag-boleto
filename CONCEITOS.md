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
