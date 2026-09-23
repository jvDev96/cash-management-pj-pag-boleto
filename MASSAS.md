# Massas de teste — linha digitável

Números gerados programaticamente (não à mão) reaproveitando o mesmo algoritmo
de `mod10.ts`/`mod11.ts`/`boletoValidator.ts` — cada um foi conferido rodando
de volta a mesma lógica de validação do projeto, garantindo que os "válidos"
realmente validam e os "inválidos" falham exatamente no motivo indicado (não
em outro, por acidente). Script descartável, não faz parte do código do
projeto.

Todos os boletos bancários abaixo usam valores **abaixo de R$500,00**, então
caem no caminho de **sucesso completo** da simulação (ver `COMANDOS.md` pra
lembrar os limiares de R$500/R$700 e a regra do `0000` final).

## Boletos bancários válidos (47 dígitos)

| Linha digitável | Banco | Valor |
|---|---|---|
| `00190000090000000001811111111107490000000012345` | Banco do Brasil | R$ 123,45 |
| `03390000020000000001811333333315990110000024690` | Santander | R$ 246,90 |
| `10490000010000000001811555555520690220000037035` | Caixa Econômica Federal | R$ 370,35 |
| `23790000090000000001811777777738590330000049380` | Bradesco | R$ 493,80 |
| `34190000090000000001811999999946290440000061725` | Itaú Unibanco | R$ 617,25 |
| `26090000010000000001812222222155390550000074070` | Nubank | R$ 740,70 |
| `00190000090000000001812444444363190660000086415` | Banco do Brasil | R$ 864,15 |
| `03390000020000000001812666666578490770000098760` | Santander | R$ 987,60 |
| `10490000010000000001812888888786690880000111105` | Caixa Econômica Federal | R$ 1.111,05 |
| `23790000090000000001813111110998690990000123450` | Bradesco | R$ 1.234,50 |
| `00191852976307418529763074185297410000000008990` | Banco do Brasil | R$ 89,90 |
| `03394185279630741852396307418523410170000015750` | Santander | R$ 157,50 |
| `10497418512963074185729630741857810340000022340` | Caixa Econômica Federal | R$ 223,40 |
| `23790741865296307418352963074183610510000029999` | Bradesco | R$ 299,99 |
| `34193074128529630741785296307417110680000035610` | Itaú Unibanco | R$ 356,10 |
| `26096307401852963074318529630743710850000042280` | Nubank | R$ 422,80 |
| `00199630734185296307741852963077611020000048750` | Banco do Brasil | R$ 487,50 |
| `03392963037418529630374185296303911190000012340` | Santander | R$ 123,40 |
| `10495296370741852963707418529637111360000019870` | Caixa Econômica Federal | R$ 198,70 |
| `23798529613074185296330741852963611530000027650` | Bradesco | R$ 276,50 |
| `34191852976307418529763074185297311700000055500` | Itaú Unibanco | R$ 555,00 |
| `26094185269630741852396307418523111870000061230` | Nubank | R$ 612,30 |
| `00197418592963074185729630741857712040000068990` | Banco do Brasil | R$ 689,90 |
| `03390741895296307418352963074183112210000071500` | Santander | R$ 715,00 |
| `10493074148529630741785296307417712380000085340` | Caixa Econômica Federal | R$ 853,40 |
| `23796307481852963074318529630743112550000099990` | Bradesco | R$ 999,90 |
| `34199630734185296307741852963077612720000112340` | Itaú Unibanco | R$ 1.123,40 |
| `26092963027418529630374185296303712890000156780` | Nubank | R$ 1.567,80 |
| `00195296350741852963707418529637413060000203450` | Banco do Brasil | R$ 2.034,50 |
| `03398529643074185296330741852963913230000345600` | Santander | R$ 3.456,00 |

> Faixas pra testar cada caminho (limiares em `COMANDOS.md`): valores **abaixo
> de R$500,00** → sucesso completo. Valores entre **R$500,00 e R$699,99** →
> falha tardia na liquidação, com compensação real (`500 ≤ valor < 700`) —
> ex: R$ 617,25, R$ 555,00, R$ 612,30, R$ 689,90. Valores **a partir de
> R$700,00** → saldo insuficiente, falha cedo (`valor ≥ 700`).

## Códigos de barras válidos (44 dígitos)

| Código de barras | Banco | Valor |
|---|---|---|
| `00197910000000543210000000000000033333333330` | Banco do Brasil | R$ 543,21 |
| `03398910700001086420000000000000033377777771` | Santander | R$ 1.086,42 |
| `10491911400001629630000000000000033422222212` | Caixa Econômica Federal | R$ 1.629,63 |
| `23795912100002172840000000000000033466666653` | Bradesco | R$ 2.172,84 |
| `34197912800002716050000000000000033511111094` | Itaú Unibanco | R$ 2.716,05 |
| `26093913500003259260000000000000033555555535` | Nubank | R$ 3.259,26 |
| `00191914200003802470000000000000033599999976` | Banco do Brasil | R$ 3.802,47 |
| `03395914900004345680000000000000033644444417` | Santander | R$ 4.345,68 |
| `10494915600004888890000000000000033688888858` | Caixa Econômica Federal | R$ 4.888,89 |
| `23794916300005432100000000000000033733333299` | Bradesco | R$ 5.432,10 |
| `00199200000000678901852963074185296307418529` | Banco do Brasil | R$ 678,90 |
| `03391201300000743204185296307418529630741852` | Santander | R$ 743,20 |
| `10491202600000811507418529630741852963074185` | Caixa Econômica Federal | R$ 811,50 |
| `23795203900000887600741852963074185296307418` | Bradesco | R$ 887,60 |
| `34199205200000954303074185296307418529630741` | Itaú Unibanco | R$ 954,30 |
| `26099206500001023406307418529630741852963074` | Nubank | R$ 1.023,40 |
| `00198207800001187609630741852963074185296307` | Banco do Brasil | R$ 1.187,60 |
| `03391209100001254302963074185296307418529630` | Santander | R$ 1.254,30 |
| `10491210400001328905296307418529630741852963` | Caixa Econômica Federal | R$ 1.328,90 |
| `23799211700001487608529630741852963074185296` | Bradesco | R$ 1.487,60 |
| `34191213000005555001852963074185296307418529` | Itaú Unibanco | R$ 5.555,00 |
| `26091214300006123004185296307418529630741852` | Nubank | R$ 6.123,00 |
| `00191215600006899007418529630741852963074185` | Banco do Brasil | R$ 6.899,00 |
| `03391216900007150000741852963074185296307418` | Santander | R$ 7.150,00 |
| `10498218200008534003074185296307418529630741` | Caixa Econômica Federal | R$ 8.534,00 |
| `23795219500009999006307418529630741852963074` | Bradesco | R$ 9.999,00 |
| `34191220800011234009630741852963074185296307` | Itaú Unibanco | R$ 11.234,00 |
| `26094222100015678002963074185296307418529630` | Nubank | R$ 15.678,00 |
| `00193223400020345005296307418529630741852963` | Banco do Brasil | R$ 20.345,00 |
| `03392224700034560008529630741852963074185296` | Santander | R$ 34.560,00 |

> Mesmas faixas de valor do boleto bancário se aplicam aqui (é a mesma saga
> por baixo — a única diferença é o formato de entrada): abaixo de R$500 →
> sucesso completo; R$689,90/R$715,00/R$743,20 → em cima do limiar, bons
> pra testar os dois lados da falha de liquidação vs. saldo insuficiente.

## Convênios válidos — DV real (48 dígitos)

**Atualizado** — desde que `calcularMod11Convenio`/`validarConvenio` foram
implementados (Layout Padrão FEBRABAN de Arrecadação v08), convênio tem DV de
verdade: 4 blocos de 12 (11 de conteúdo + 1 DV de bloco) + DV geral,
reconstruindo o código de barras de 44 dígitos. O dígito identificador
(posição 3) escolhe o módulo — `6`/`7` usa Mod10, `8`/`9` usa
`calcularMod11Convenio` (regra própria, baseada no resto — ver
`CONCEITOS.md`). Gerados programaticamente com o mesmo algoritmo e conferidos
rodando `validarConvenio` de volta contra cada um.

| Linha digitável (48) | Identificador | Módulo | Valor |
|---|---|---|---|
| `816300000014234518529636074185296303741852963072` | `6` | Mod10 | R$ 123,45 |
| `826400000988760029630745185296307415852963074186` | `6` | Mod10 | R$ 9.876,00 |
| `838200000029469030741850296307418526963074185298` | `8` | Mod11 | R$ 246,90 |
| `848800000558555541852964307418529635074185296304` | `8` | Mod11 | R$ 5.555,55 |
| `867400000016111152963075418529630745185296307415` | `7` | Mod10 | — (quantidade/referência, não é valor direto) |
| `899100000029222263074181529630741859296307418526` | `9` | Mod11 | — (quantidade/referência, não é valor direto) |
| `816200000031452129630748185296307415852963074186` | `6` | Mod10 | R$ 345,21 |
| `826800000042567041852961307418529631074185296303` | `6` | Mod10 | R$ 456,70 |
| `836500000077890074185293630741852960307418529631` | `6` | Mod10 | R$ 789,00 |
| `846300000128345007418527963074185298630741852960` | `6` | Mod10 | R$ 1.234,50 |
| `856200000565780030741851296307418529963074185298` | `6` | Mod10 | R$ 5.678,00 |
| `868600000028345663074184529630741859296307418526` | `8` | Mod11 | R$ 234,56 |
| `878600000050678096307417852963074184529630741859` | `8` | Mod11 | R$ 567,80 |
| `888400000088901029630741185296307411852963074184` | `8` | Mod11 | R$ 890,10 |
| `898300000130456052963072418529630743185296307411` | `8` | Mod11 | R$ 1.345,60 |
| `818900000671890085296305741852963078418529630743` | `8` | Mod11 | R$ 6.789,00 |
| `827400000010111118529630074185296303741852963072` | `7` | Mod10 | — (quantidade/referência, não é valor direto) |
| `837700000024222241852961307418529631074185296303` | `7` | Mod10 | — (quantidade/referência, não é valor direto) |
| `847400000034333374185291630741852960307418529631` | `7` | Mod10 | — (quantidade/referência, não é valor direto) |
| `857700000048444407418524963074185298630741852960` | `7` | Mod10 | — (quantidade/referência, não é valor direto) |
| `867200000059555530741852296307418529963074185298` | `7` | Mod10 | — (quantidade/referência, não é valor direto) |
| `879100000067666663074186529630741859296307418526` | `9` | Mod11 | — (quantidade/referência, não é valor direto) |
| `889700000073777796307418852963074184529630741859` | `9` | Mod11 | — (quantidade/referência, não é valor direto) |
| `899400000083888829630745185296307411852963074184` | `9` | Mod11 | — (quantidade/referência, não é valor direto) |
| `819000000096999952963074418529630743185296307411` | `9` | Mod11 | — (quantidade/referência, não é valor direto) |
| `829600000019010185296308741852963078418529630743` | `9` | Mod11 | — (quantidade/referência, não é valor direto) |

> Linhas com identificador `7`/`9` (10 no total, "sem valor" na tabela)
> servem especificamente pra testar `extrairValorLocal`/
> `extrairDigitosValorConvenio` devolvendo **sem valor** (campo "Valor" não
> aparece na prévia local, e o botão "Confirmar Pagamento" fica desabilitado
> com aviso — ver `PagamentoPage.tsx`) mesmo com a linha inteira válida —
> não é bug, é a semântica do campo (quantidade de moeda ou valor de
> referência a reajustar, não R$ direto). As com identificador `6`/`8` (10
> no total) têm valor de verdade e também variam segmento (posição 2, `1`
> a `9`) — útil pra mostrar que o "Banco" não aparece pra nenhuma delas
> (ver `CONCEITOS.md`, entrada sobre o bug do banco no convênio).

Pra gerar um DV_BLOCO/DV_GERAL inválido de convênio: pega qualquer linha
acima e troca um dígito dentro de um bloco de 12 (nunca o último dígito do
bloco, que é o próprio DV) — o bloco correspondente falha
(`DV_BLOCO_1_INVALIDO`..`DV_BLOCO_4_INVALIDO`). Pra forçar
`DV_GERAL_INVALIDO` especificamente (sem mexer em nenhum DV de bloco), é
preciso reconstruir com cuidado (ver `CONCEITOS.md`, entrada sobre o teste
de `boletoValidator.test.ts` — o dígito 4 do código de barras reconstruído
mora dentro do conteúdo do 1º bloco, então trocá-lo sozinho quebra o DV do
bloco 1 também).

## Guard de pagamento duplicado (mesmo "documento" / mesma linha digitável)

Boleto reservado só pra esse teste — nunca reaproveitado em outra tabela
deste arquivo, pra garantir que o estado dele fica sob seu controle:

```
34191815020009000000100019999994846290000049900   (Itaú, R$ 499,00 — abaixo de R$500, sucesso completo)
```

**Passo a passo** (confere o guard implementado no `BoletoController`/
`ConsultaBoletoService.consultar` — devolve `sagaExistente`/
`estadoSagaExistente` no mesmo preview, via
`SagaRepository.findFirstByLinhaDigitavelAndEstadoNotInOrderByCriadoEmDesc`):

1. Cole a linha acima, confirme o pagamento, espere chegar em `CONCLUIDO`.
2. Cole a **mesma linha de novo** no input (pode ser em outra aba/sessão, o
   guard não depende de sessão nem de cookie — é só pela `linhaDigitavel`).
   O card de revisão já deve mostrar o botão como **"Acompanhar Pagamento"**
   em vez de "Confirmar Pagamento" — é o front reagindo a
   `sagaExistente != null` no preview, sem nem precisar tentar o POST.
3. Clicar em "Acompanhar Pagamento" leva direto pro `PaymentStatusTracker`
   da saga **já concluída** — não cria uma saga nova (diferente do "Tentar
   Novamente", que troca a Idempotency-Key de propósito quando a saga
   anterior falhou).

**Pra provar o contraste** (estado que NÃO bloqueia — `REJEITADO`/
`FALHOU`/`SALDO_LIBERADO`, ver `SagaState.ESTADOS_QUE_NAO_BLOQUEIAM_NOVO_PAGAMENTO`):
usa qualquer linha da tabela de boletos bancários com valor **≥ R$700,00**
(cai em `REJEITADO` por saldo insuficiente). Repete o pagamento com a MESMA
linha — dessa vez o botão continua "Confirmar Pagamento" normalmente, prova
de que só o sucesso trava um reenvio, não qualquer tentativa anterior.

## Inválidos — 3 por motivo possível

### `TAMANHO_INVALIDO` (nem 44, nem 47, nem 48 dígitos)

```
1111111111111111111111111111111111111111111        (43 dígitos)
1111111111111111111111111111111111111111111111     (46 dígitos)
11111111111111111111111111111111111111111111111111 (50 dígitos)
```

### `DV_BLOCO_1_INVALIDO` (Mod10 do 1º bloco não confere)

```
00190000000000000001811111111107490000000012345
03390000030000000001811333333315990110000024690
10490000020000000001811555555520690220000037035
```

### `DV_BLOCO_2_INVALIDO` (Mod10 do 2º bloco não confere)

```
23790000090000000001911777777738590330000049380
34190000090000000001911999999946290440000061725
26090000010000000001912222222155390550000074070
```

### `DV_BLOCO_3_INVALIDO` (Mod10 do 3º bloco não confere)

```
00190000090000000001812444444364190660000086415
03390000020000000001812666666579490770000098760
10490000010000000001812888888787690880000111105
```

### `DV_GERAL_INVALIDO` (Mod11 geral não confere — pode ser boleto ou código de barras)

```
00190000090000000001811111111107590000000012345
03390000020000000001811333333315090110000024690
10490000010000000001811555555520790220000037035
```

Pra testar esse mesmo motivo em código de barras (44 dígitos), pega qualquer
linha da tabela de código de barras válido e altera o dígito na **posição 5**
(índice 4, o DV geral) pra qualquer outro número — o Mod11 vai reprovar.
