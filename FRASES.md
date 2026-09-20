# Frases — banco de respostas pra entrevista

Frases prontas, no formato "se te perguntarem X, a resposta é assim", coletadas ao
longo do desenvolvimento. Complementa o [CONCEITOS.md](CONCEITOS.md) (que explica o
"o quê" e o "por quê") com o "como eu digo isso em voz alta, em 15 segundos".

---

**Sobre resiliência de ambiente/infraestrutura local (ex: Docker falhando numa demo):**
> "Eu trato falha de infraestrutura local com o mesmo princípio que uso no próprio
> sistema — nunca deixo uma dependência externa travar o fluxo, sempre tenho um
> caminho de recuperação já preparado."

**Sobre por que a regra de transição da Saga mora dentro do enum `SagaState`:**
> "Encapsulei a máquina de estados no próprio enum porque é onde a coesão é maior e
> onde dá pra testar a regra de negócio isolada de infraestrutura — sabendo que isso
> é uma troca consciente, não a única forma certa."

**Sobre por que os commits ficam direto no `master`, sem branch de feature:**
> "Aqui commitei direto no branch principal porque é um exercício solo com prazo
> curto e a documentação mora nos commits; num time eu isolaria cada mudança numa
> branch de feature revisada por PR antes do merge."
