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
