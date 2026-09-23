export const BANCOS: Record<string, string> = {
  "001": "Banco do Brasil",
  "033": "Santander",
  "104": "Caixa Econômica Federal",
  "237": "Bradesco",
  "341": "Itaú Unibanco",
  "260": "Nubank",
};

export function detectarBanco(linhaDigitavel: string): string | null {
  if (linhaDigitavel.length < 3 || linhaDigitavel.length === 48) {
    // convenio (48 digitos) nao tem "banco emissor" - os 3 primeiros
    // digitos ali sao produto+segmento+identificador, nao um codigo de
    // banco (ver ConsultaBoletoService.java, mesma decisao espelhada aqui)
    return null;
  }
  const codigo = linhaDigitavel.slice(0, 3);
  return BANCOS[codigo] ?? null;
}
