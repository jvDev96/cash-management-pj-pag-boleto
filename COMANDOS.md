# Comandos do projeto

Guia vivo: vou adicionando aqui os comandos assim que forem aparecendo no processo,
sempre com "pra que serve". Ideia é você conseguir rodar o projeto do zero só lendo
este arquivo, sem depender de lembrar de cabeça.

## Git (raiz do repositório)

| Comando | Pra que serve |
|---|---|
| `git status` | Mostra o que mudou desde o último commit — roda isso antes de qualquer commit, sempre. |
| `git add <arquivo>` | Coloca um arquivo específico "na prateleira" pronta pra virar commit. Evite `git add .` até ter o hábito de revisar o `git status` antes. |
| `git commit -m "tipo: mensagem"` | Cria o commit. Convenção usada neste projeto: [Conventional Commits](#convenção-de-commits) abaixo. |
| `git log --oneline` | Histórico compacto, uma linha por commit — é o que você vai mostrar/explicar na entrevista. |

### Convenção de commits

Usamos prefixos (`tipo: descrição`) pra cada commit contar a história do projeto sozinho:

- `chore:` — infraestrutura/scaffolding, não é lógica de negócio (ex: criar estrutura de pastas)
- `feat:` — uma funcionalidade nova
- `fix:` — correção de bug
- `test:` — adição/ajuste de testes
- `docs:` — documentação (README, este arquivo, comentários grandes)
- `refactor:` — mudança de estrutura sem mudar comportamento

## Infraestrutura local (Docker — raiz do repositório)

| Comando | Pra que serve |
|---|---|
| `docker compose up -d` | Sobe Postgres + RabbitMQ em background. Roda isso antes de iniciar o backend. |
| `docker compose ps` | Mostra se os containers estão saudáveis (`healthy`). |
| `docker compose logs -f rabbitmq` | Acompanha os logs do RabbitMQ ao vivo — útil pra ver mensagem chegando/saindo de fila. |
| `docker compose down` | Derruba os containers (dados do Postgres ficam salvos no volume). |
| `docker compose down -v` | Derruba containers **e apaga os dados** (banco zerado do zero). Use quando quiser recomeçar limpo. |

RabbitMQ tem uma UI web em **http://localhost:15672** (login `boleto_saga` / `boleto_saga`) —
dá pra ver filas, mensagens presas e a dead-letter queue visualmente, sem digitar nada.

## Backend (pasta `backend/`, Java + Maven)

O projeto usa o **Maven Wrapper** (`mvnw`) em vez de exigir Maven instalado globalmente —
é por isso que os comandos começam com `./mvnw` (ou `mvnw.cmd` no PowerShell) e não `mvn`.

| Comando (PowerShell) | Pra que serve |
|---|---|
| `.\mvnw.cmd spring-boot:run` | Sobe a aplicação Spring Boot localmente. |
| `.\mvnw.cmd test` | Roda os testes unitários (JUnit). |
| `.\mvnw.cmd clean package` | Compila e gera o `.jar` final, rodando os testes no caminho. |

### Referência: ciclo de vida do Maven

Os comandos acima usam `mvnw` (o wrapper, não exige Maven instalado — [ver nota acima](#backend-pasta-backend-java--maven)). O ciclo de vida por trás é o mesmo do `mvn` "puro":

| Comando | Pra que serve |
|---|---|
| `mvn clean` | Apaga a pasta `target/`, removendo compilados antigos — build do zero. |
| `mvn compile` | Compila o código-fonte e gera os `.class` em `target/`. |
| `mvn test` | Roda os testes unitários (JUnit). |
| `mvn package` | Compila, testa e empacota o resultado em `.jar`/`.war` dentro de `target/`. |
| `mvn install` | Faz tudo acima e ainda instala o artefato no repositório Maven local (`~/.m2`), pra outros projetos da máquina reaproveitarem como dependência. |
| `mvn clean install` | Combinação mais usada: limpa do zero e instala o artefato atualizado localmente. |
| `mvn clean package` | Limpa, compila e empacota, sem instalar no repositório local. |
| `mvn ... -DskipTests` | Pula a execução dos testes (agiliza o build, ex: `mvn clean install -DskipTests`). |
| `mvn dependency:tree` | Mostra a árvore de dependências no terminal — útil pra achar conflito de versão. |

## Frontend (pasta `frontend/`, Node + npm)

| Comando | Pra que serve |
|---|---|
| `npm install` | Instala as dependências listadas no `package.json` (só precisa rodar de novo se o `package.json` mudar). |
| `npm run dev` | Sobe o servidor de desenvolvimento do Vite com hot-reload. |
| `npm run build` | Gera o build de produção (TypeScript é checado nesse passo). |
| `npm run test` | Roda os testes (Vitest) — será adicionado quando começarmos a validação do boleto. |

## Problemas conhecidos

**`unable to get image ... dockerDesktopLinuxEngine ... system cannot find the file specified`**
O Docker Desktop não está aberto. Abra o app (ícone da baleia) e espere ele ficar "Running" antes de rodar `docker compose up -d` de novo.

**RabbitMQ reinicia sozinho / `Exited (1)` logo após subir, log mostra `Error when reading /var/lib/rabbitmq/.erlang.cookie: eacces`**
Falha transitória na primeira subida do container no Docker Desktop/Windows — o processo interno do RabbitMQ (Erlang) não consegue ler um arquivo de permissão a tempo. Corrige recriando só o container do RabbitMQ, sem mexer no Postgres:
```powershell
docker compose rm -f -s rabbitmq
docker compose up -d rabbitmq
```

**Aplicação sobe sem erro, mas nenhuma fila/exchange aparece na UI do RabbitMQ (`localhost:15672`)**
Bug confirmado neste Spring Boot 4.1.1: o `RabbitAdmin` não dispara a declaração automática de filas/exchanges/bindings na inicialização (comportamento que era automático em versões anteriores do Spring). Corrigido em `SagaMessagingConfig.java` com um `ApplicationListener<ApplicationReadyEvent>` que chama `amqpAdmin.initialize()` explicitamente — já faz parte do código, não precisa refazer nada, só documentado aqui pra não assustar se aparecer de novo em outra máquina/versão.