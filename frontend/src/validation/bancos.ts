export const BANCOS: Record<string, string> = {
  "001": "Banco do Brasil",
  "033": "Santander",
  "104": "Caixa Econômica Federal",
  "237": "Bradesco",
  "341": "Itaú Unibanco",
  "260": "Nubank",
};

export function detectarBanco(linhaDigitavel: string): string | null {
  if (linhaDigitavel.length < 3) {
    return null;
  }
  const codigo = linhaDigitavel.slice(0, 3);
  return BANCOS[codigo] ?? null;
}
