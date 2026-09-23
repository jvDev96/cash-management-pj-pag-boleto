# Boleto + Saga — Case Técnico Cash Management PJ

Sistema de pagamento de boletos implementado com **Saga orquestrada** sobre
mensageria assíncrona (RabbitMQ), com compensação automática, idempotência,
e acompanhamento em tempo real. Backend em Java 17 / Spring Boot 4.1.1;
frontend em React 19 / TypeScript.

**Por quê Saga orquestrada, e não um endpoint síncrono único?** A justificativa
completa, requisito por requisito, está no [Mapa da Campanha](https://claude.ai/artifact/Q5cLkmdyfS7LD9qB8uH6d7).
A referência técnica do que foi construído (máquina de estados, topologia do
RabbitMQ, superfície REST) está em [Arquitetura Implementada](https://claude.ai/artifact/9BkZn2ERo82VNqPtAHkbwc)
e replicada em SVG em [`docs/`](docs/).

## Sumário

- [Boleto + Saga — Case Técnico Cash Management PJ](#boleto--saga--case-técnico-cash-management-pj)
  - [Sumário](#sumário)
  - [Como rodar](#como-rodar)
  - [Arquitetura, em resumo](#arquitetura-em-resumo)
  - [Decisões técnicas principais](#decisões-técnicas-principais)
  - [Testes](#testes)
  - [Diferenciais implementados](#diferenciais-implementados)
  - [Limitações conhecidas](#limitações-conhecidas)
  - [Estrutura do repositório](#estrutura-do-repositório)

## Como rodar

Pré-requisitos: Docker Desktop, Java 17, Node 18+.

```powershell
# 1. Infraestrutura (Postgres + RabbitMQ)
docker compose up -d

# 2. Backend
cd backend
.\mvnw.cmd spring-boot:run
# API em http://localhost:8080

# 3. Frontend (outro terminal)
cd frontend
copy .env.example .env
npm install
npm run dev
# App em http://localhost:5173
```

RabbitMQ (filas/DLQ): `http://localhost:15672` (login `boleto_saga`/`boleto_saga`).
Comandos completos, troubleshooting e exemplos de `curl`: [`COMANDOS.md`](COMANDOS.md).
Números de boleto prontos pra testar (válidos e inválidos, por motivo de
falha): [`MASSAS.md`](MASSAS.md).

## Arquitetura, em resumo

```
Frontend (React) → API REST → Saga Orchestrator → RabbitMQ (8 filas + DLQ) → 3 serviços simulados → Postgres
                                       ↑
                         SagaTimeoutScheduler (polling 10s, RNF03)
```

- **8 estados** na máquina da Saga (`RECEBIDO` → `VALIDADO` → `SALDO_RESERVADO`
  → `LIQUIDACAO_ENVIADA` → `CONCLUIDO`, com `REJEITADO`/`SALDO_LIBERADO`/`FALHOU`
  cobrindo rejeição e compensação).
- **Mensageria real**, não simulação em memória: 4 filas de comando + 4 de
  evento + 1 DLQ compartilhada, consumidas por 3 serviços simulados
  (Validação de Boleto, Conta/Saldo, Liquidação) rodando no mesmo processo
  mas comunicando só via fila.
- **Compensação automática** em dois gatilhos: resposta explícita de falha
  (`LiquidacaoListener` responde erro) ou timeout (`SagaTimeoutScheduler`
  detecta uma saga presa há mais de 30s numa etapa que espera resposta).
- **Histórico auditável** (`SagaTransicao`): cada transição de estado vira
  uma linha, não só o estado atual — alimenta a timeline em tempo real do front.
- **Frontend**: 3 páginas (Home, Pagar Boleto, Histórico), 4 hooks
  (`useBoletoValidation`, `useBoletoPreview`, `usePaymentSaga`, `usePaymentHistory`),
  design system em SCSS com CSS Modules.

Diagramas completos (máquina de estados, topologia RabbitMQ, superfície REST):
ver [`docs/`](docs/) ou o artifact [Arquitetura Implementada](https://claude.ai/artifact/9BkZn2ERo82VNqPtAHkbwc).

## Decisões técnicas principais

Resumo curado — a extração completa de **todo** comentário `DECISAO`/`PORQUE`
do código (57 no total, back e front, com arquivo/linha) está em
[`docs/DECISOES.md`](docs/DECISOES.md).

| Decisão | Motivo, resumido |
|---|---|
| Saga **orquestrada**, não coreografada | Um único componente (`SagaOrchestrator`) decide "o que vem depois" — mais fácil de raciocinar, testar e observar do que lógica de transição espalhada entre serviços. |
| `SagaState` como enum com mapa de transições válidas | A entidade `Saga` nunca aceita uma transição inválida — `transicionarPara(...)` valida contra `podeTransicionarPara`, não existe `setEstado` genérico. |
| Publica evento **antes** de confirmar (ack) o comando | Ordem inversa arriscaria perda silenciosa de mensagem se o ack acontecesse e o publish falhasse depois. |
| `@Version` (lock otimista) na `Saga` | Corrida real entre o Orchestrator (reagindo a evento) e o Scheduler (detectando timeout) escrevendo a mesma linha ao mesmo tempo — sem isso, um sobrescreve o outro silenciosamente. |
| Idempotência em duas camadas (HTTP + DB) | `Idempotency-Key` protege reenvio acidental do cliente; `UNIQUE` no banco protege a corrida entre duas requisições simultâneas com a mesma chave. |
| `SagaTransicao` (histórico append-only) | Motivado pelo Figma — a timeline mostra timestamp por etapa, não só o estado atual; sem isso não daria pra saber em qual etapa exata uma saga falhou. |
| Validação Mod10/Mod11 **na borda** (client), sanitização única | Fail-fast antes de qualquer request; funções de domínio confiam que recebem dígito puro, sem checagem duplicada. |
| `MotivoInvalido` em vez de só `boolean` | Mensagem de erro específica por causa (tamanho, qual bloco de DV, DV geral) — não um "inválido" genérico. |
| `usePaymentSaga.reiniciar()` gera **nova** Idempotency-Key | A saga anterior terminou em estado terminal (sem transição de volta) — reenviar com a mesma chave nunca teria efeito, mesmo corrigido o problema original. |
| `AbortController` em `useBoletoPreview`/`usePaymentHistory` | Evita condição de corrida: resposta antiga (de uma busca já obsoleta) sobrescrevendo o estado mais novo. |
| Sem `useMemo` nos cálculos derivados | Custo do cálculo é ínfimo (fatiar string, mapear array pequeno) — otimizar sem medir gargalo é complexidade sem benefício comprovado. |

## Testes

**19 testes de backend** (JUnit + Mockito) — máquina de estados, entidade
`Saga`, e `SagaOrchestrator` (incluindo teste de regressão com `InOrder`
para o bug de ordem save/publish, e prova formal via `ArgumentCaptor` de
que o histórico grava as 2 linhas certas mesmo com 1 save só).

**45 testes de frontend** (Vitest + Testing Library) — algoritmos Mod10/Mod11
(valores calculáveis à mão), `boletoValidator`, os 4 hooks (com mock de
`fetch`, fake timers pro polling), e os componentes visuais.

```powershell
cd backend && .\mvnw.cmd test
cd frontend && npm run test
```

## Diferenciais implementados

Além do obrigatório (validação Mod10/Mod11, fluxo completo com compensação,
status assíncrono consultável, testes unitários):

- **Dead-letter queue** — mensagem que falha o processamento nunca desaparece silenciosamente.
- **Histórico de transições auditável** (`SagaTransicao`) alimentando timeline em tempo real.
- **Tela de histórico de pagamentos** com paginação real (`Page<T>` do Spring Data).
- **Protocolo de confirmação** gerado no sucesso, exibido só quando cabível.
- **Mensagem de erro específica por motivo** de invalidez (não um "inválido" genérico).
- **Retry seguro**: botão "Tentar Novamente" com idempotency key nova (ver `docs/DECISOES.md`).
- **Diagramas de arquitetura** (design + as-built) publicados e versionados em `docs/`.

## Limitações conhecidas

- **Convênio (48 dígitos)**: validação só estrutural (tamanho + dígitos),
  sem DV. O DV real de convênio é **condicional** — a regra muda dependendo
  de um dígito identificador dentro do próprio número, não é o mesmo
  algoritmo fixo do boleto bancário/código de barras.
- **Retry com backoff configurável** (Spring Retry) não implementado — só a
  DLQ. Ganho real de retry automático é maior contra uma dependência externa
  genuinamente instável; nossos listeners simulados falham de forma
  determinística (reenviar produziria a mesma falha). Se implementado
  depois, seria aditivo: o guard de idempotência por estado já existe.
- **Testes são unitários, não de integração** — Mockito no backend, mocks de
  `fetch` no frontend. Nenhum teste sobe Postgres/RabbitMQ reais
  (Testcontainers não foi usado).
- **Status em tempo real via polling, não WebSocket/SSE** — RF04 permite
  polling explicitamente; troca por push seria evolução natural.
- **Timeout assume falha por silêncio** — o `SagaTimeoutScheduler` compensa
  uma saga presa sem confirmar com o sistema externo se a operação
  realmente não aconteceu (problema conhecido de sistemas distribuídos:
  timeout não é o mesmo que "sei que falhou"). Não é um risco real aqui
  porque os serviços simulados sempre respondem na hora, sem essa
  ambiguidade — mas seria a primeira coisa a endurecer numa integração real.
- **Delay artificial nos listeners simulados** (`SimulacaoDelay`, 3000ms) —
  existe só pra tornar a timeline visível numa demonstração; não estaria
  presente numa integração real (o serviço externo teria sua própria latência).

## Estrutura do repositório

```
backend/    Spring Boot 4.1.1 — Saga, mensageria, REST
frontend/   React 19 + TypeScript — validação, hooks, páginas
docs/       Diagramas de arquitetura (SVG) + decisões técnicas completas
COMANDOS.md Referência de comandos + troubleshooting
MASSAS.md   Números de boleto de teste (válidos e inválidos por motivo)
```
