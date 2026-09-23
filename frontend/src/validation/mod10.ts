export function calcularMod10(digitos: string): number {
  let soma = 0;
  let multiplicador = 2;

  for (let i = digitos.length - 1; i >= 0; i--) {
    let produto = Number(digitos[i]) * multiplicador;
    if (produto >= 10) {
      produto = Math.floor(produto / 10) + (produto % 10);
    }
    soma += produto;
    multiplicador = multiplicador === 2 ? 1 : 2;
  }

  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}
