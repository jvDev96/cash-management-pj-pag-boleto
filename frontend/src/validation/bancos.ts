// DECISAO: Record<string, string>, nao um TS `enum`.
// PORQUE: as chaves sao codigos com zero a esquerda ("001", "033") - um enum
// nao aceita chave comecando com digito, e um enum numerico perderia o zero
// a esquerda (001 vira 1). Record e a mesma ideia de tabela de consulta
// (mesmo padrao ja usado em MENSAGENS_POR_MOTIVO), so que com chave string
// livre - exatamente o que um mapa "codigo do banco -> nome" precisa.
// Espelha BANCOS em ConsultaBoletoService.java (backend) - duplicado de
// proposito, um so pra exibicao reativa no client antes do GET confirmar.
export const BANCOS: Record<string, string> = {
  "001": "Banco do Brasil",
  "033": "Santander",
  "104": "Caixa Econômica Federal",
  "237": "Bradesco",
  "341": "Itaú Unibanco",
  "260": "Nubank",
};

// DECISAO: os 3 primeiros digitos sao o codigo do banco emissor em QUALQUER
// dos 3 formatos (codigo de barras, boleto bancario, convenio) - e a mesma
// posicao porque a linha digitavel e so uma reordenacao do codigo de barras,
// e o codigo de barras comeca com banco(3) + moeda(1) + DV(1) + ...
export function detectarBanco(linhaDigitavel: string): string | null {
  if (linhaDigitavel.length < 3) {
    return null;
  }
  const codigo = linhaDigitavel.slice(0, 3);
  return BANCOS[codigo] ?? null;
}
