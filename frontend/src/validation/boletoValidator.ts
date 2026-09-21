import { calcularMod10 } from "./mod10";
import { calcularMod11 } from "./mod11";

export type FormatoLinhaDigitavel =
  | "CODIGO_DE_BARRAS"
  | "BOLETO"
  | "CONVENIO"
  | "INVALIDO";
  

export function detectarFormato(linhaDigitavel: string): FormatoLinhaDigitavel {
  // DECISAO: retorno e um union type de strings literais, nao boolean nem string livre.
  // PORQUE: esse valor vai virar branching de logica (qual validacao rodar depois),
  // entao o compilador precisa conhecer os 4 casos possiveis - nao so exibicao pro usuario.
  switch (linhaDigitavel.length) {
    case 44:
      return "CODIGO_DE_BARRAS";
    case 47:
      return "BOLETO";
    case 48:
      return "CONVENIO";
    default:
      return "INVALIDO";
  }
}

export type ResultadoValidacao = {
  valido: boolean;
  formato: FormatoLinhaDigitavel;
};

// DECISAO: valida "so digitos" acontece na borda (sanitizacao), nao aqui.
// PORQUE: evitar checagem duplicada - a funcao de dominio confia no contrato
// de que so recebe string ja sanitizada, mesmo padrao usado pro backend.
export function validarLinhaDigitavel(linhaDigitavel: string): ResultadoValidacao {
  const formato = detectarFormato(linhaDigitavel);

  switch (formato) {
    case "INVALIDO":
      return { valido: false, formato };
    case "CODIGO_DE_BARRAS":
    case "CONVENIO":
      return { valido: true, formato };
    case "BOLETO":
      return { valido: validarBoletoBancario(linhaDigitavel), formato };
  }
}

function validarBoletoBancario(linhaDigitavel: string): boolean {
  const campo1 = linhaDigitavel.slice(0, 10);
  const campo2 = linhaDigitavel.slice(10, 21);
  const campo3 = linhaDigitavel.slice(21, 32);
  const campo4 = linhaDigitavel.slice(32, 33);
  const campo5 = linhaDigitavel.slice(33, 47);

  const dv1Esperado = calcularMod10(campo1.slice(0,9));
  const dv1Valido = dv1Esperado === Number(campo1.slice(9 ,10));

  const dv2Esperado = calcularMod10(campo2.slice(0, 10));
  const dv2Valido = dv2Esperado === Number(campo2.slice(10, 11));

  const dv3Esperado = calcularMod10(campo3.slice(0, 10));
  const dv3Valido = dv3Esperado === Number(campo3.slice(10, 11));

  const barcodeSemDv =
    campo1.slice(0, 4) +
    campo5 +
    campo1.slice(4, 9) +
    campo2.slice(0, 10) +
    campo3.slice(0, 10);

  const dvGeralEsperado = calcularMod11(barcodeSemDv);
  const dvGeralValido = dvGeralEsperado === Number(campo4);
  
  return dv1Valido && dv2Valido && dv3Valido && dvGeralValido;
}