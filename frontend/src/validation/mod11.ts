export function calcularMod11(digitos: string): number {
  let soma = 0;
  let multiplicador = 2;

  for (let i = digitos.length - 1; i >= 0; i--) {
    soma += Number(digitos[i]) * multiplicador;
    multiplicador = multiplicador === 9 ? 2 : multiplicador + 1;
  }

  const resto = soma % 11;
  const dv = 11 - resto;

  return dv === 0 || dv === 1 || dv >= 10 ? 1 : dv;
}

// Regra de arredondamento do Layout FEBRABAN de Arrecadação/Convênio (v08) -
// diferente da regra de calcularMod11 (cobrança/boleto bancário).
export function calcularMod11Convenio(digitos: string): number {
  let soma = 0;
  let multiplicador = 2;

  for (let i = digitos.length - 1; i >= 0; i--) {
    soma += Number(digitos[i]) * multiplicador;
    multiplicador = multiplicador === 9 ? 2 : multiplicador + 1;
  }

  const resto = soma % 11;
  if (resto === 0 || resto === 1) {
    return 0;
  }
  if (resto === 10) {
    return 1;
  }
  return 11 - resto;
}
