import { calcularMod10 } from "./mod10";
import { calcularMod11 } from "./mod11";

export type FormatoLinhaDigitavel =
| "CODIGO_DE_BARRAS"
| "BOLETO"
| "CONVENIO"
| "INVALIDO";

export type MotivoInvalido =
  | "TAMANHO_INVALIDO"
  | "DV_BLOCO_1_INVALIDO"
  | "DV_BLOCO_2_INVALIDO"
  | "DV_BLOCO_3_INVALIDO"
  | "DV_GERAL_INVALIDO"
  | null; // null quando é válido

export type ResultadoValidacao = {
  valido: boolean;
  formato: FormatoLinhaDigitavel;
  motivo: MotivoInvalido;
};

export const TAMANHO_MINIMO_LINHA_DIGITAVEL = 44; //especificação FEBRABAN
export const TAMANHO_MAXIMO_FORMATO_VALIDO = 48; //especificação FEBRABAN - maior formato valido (convenio)
export const TAMANHO_MAXIMO_LINHA_DIGITAVEL = 70; //margem de segurança de UI

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

// DECISAO: valida "so digitos" acontece na borda (sanitizacao), nao aqui.
// PORQUE: evitar checagem duplicada - a funcao de dominio confia no contrato
// de que so recebe string ja sanitizada, mesmo padrao usado pro backend.
export function validarLinhaDigitavel(linhaDigitavel: string): ResultadoValidacao {
  const formato = detectarFormato(linhaDigitavel);

  switch (formato) {
    case "INVALIDO":
      return { valido: false, formato, motivo: "TAMANHO_INVALIDO" };
    case "CODIGO_DE_BARRAS": {
      const motivo = validarCodigoDeBarras(linhaDigitavel);
      return { valido: motivo === null, formato, motivo };
    }
    case "CONVENIO":
      return { valido: true, formato, motivo: null };
    case "BOLETO": {
      const motivo = validarBoletoBancario(linhaDigitavel);
      return { valido: motivo === null, formato, motivo };
    }
  }
}


function validarBoletoBancario(linhaDigitavel: string): MotivoInvalido {
  const campo1 = linhaDigitavel.slice(0, 10);
  const campo2 = linhaDigitavel.slice(10, 21);
  const campo3 = linhaDigitavel.slice(21, 32);
  const campo4 = linhaDigitavel.slice(32, 33);
  const campo5 = linhaDigitavel.slice(33, 47);

  const dv1Esperado = calcularMod10(campo1.slice(0, 9));
  const dv1Valido = dv1Esperado === Number(campo1.slice(9, 10));
  if (!dv1Valido) {
    return "DV_BLOCO_1_INVALIDO";
  }

  const dv2Esperado = calcularMod10(campo2.slice(0, 10));
  const dv2Valido = dv2Esperado === Number(campo2.slice(10, 11));
  if (!dv2Valido) {
    return "DV_BLOCO_2_INVALIDO";
  }

  const dv3Esperado = calcularMod10(campo3.slice(0, 10));
  const dv3Valido = dv3Esperado === Number(campo3.slice(10, 11));
  if (!dv3Valido) {
    return "DV_BLOCO_3_INVALIDO";
  }

  const barcodeSemDv =
    campo1.slice(0, 4) +
    campo5 +
    campo1.slice(4, 9) +
    campo2.slice(0, 10) +
    campo3.slice(0, 10);

  const dvGeralEsperado = calcularMod11(barcodeSemDv);
  const dvGeralValido = dvGeralEsperado === Number(campo4);
  if (!dvGeralValido) {
    return "DV_GERAL_INVALIDO";
  }

  return null;
}

function validarCodigoDeBarras(codigoDeBarras: string): MotivoInvalido {
  const semDv = codigoDeBarras.slice(0, 4) + codigoDeBarras.slice(5);
  const dvEsperado = calcularMod11(semDv);
  const dvInformado = Number(codigoDeBarras[4]);
  return dvEsperado === dvInformado ? null : "DV_GERAL_INVALIDO";
}
