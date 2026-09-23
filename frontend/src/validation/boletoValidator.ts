import { calcularMod10 } from "./mod10";
import { calcularMod11, calcularMod11Convenio } from "./mod11";

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
  | "DV_BLOCO_4_INVALIDO"
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

export function validarLinhaDigitavel(linhaDigitavel: string): ResultadoValidacao {
  const formato = detectarFormato(linhaDigitavel);

  switch (formato) {
    case "INVALIDO":
      return { valido: false, formato, motivo: "TAMANHO_INVALIDO" };
    case "CODIGO_DE_BARRAS": {
      const motivo = validarCodigoDeBarras(linhaDigitavel);
      return { valido: motivo === null, formato, motivo };
    }
    case "CONVENIO": {
      const motivo = validarConvenio(linhaDigitavel);
      return { valido: motivo === null, formato, motivo };
    }
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

const MOTIVOS_BLOCO_CONVENIO: MotivoInvalido[] = [
  "DV_BLOCO_1_INVALIDO",
  "DV_BLOCO_2_INVALIDO",
  "DV_BLOCO_3_INVALIDO",
  "DV_BLOCO_4_INVALIDO",
];

// Layout FEBRABAN de Arrecadação/Convênio (v08): a linha digitável de 48
// dígitos são 4 blocos de 11 dígitos de conteúdo + 1 DV de bloco cada. O
// dígito na posição 3 do código de barras reconstruído escolhe o módulo
// (10 para "6"/"7", 11 para "8"/"9") usado tanto nos DVs de bloco quanto no
// DV geral.
function validarConvenio(linhaDigitavel: string): MotivoInvalido {
  const usaMod11 = linhaDigitavel[2] === "8" || linhaDigitavel[2] === "9";
  const calcularDv = usaMod11 ? calcularMod11Convenio : calcularMod10;

  const conteudos: string[] = [];
  for (let b = 0; b < 4; b++) {
    const bloco = linhaDigitavel.slice(b * 12, b * 12 + 12);
    const conteudo = bloco.slice(0, 11);
    const dvInformado = Number(bloco[11]);
    if (calcularDv(conteudo) !== dvInformado) {
      return MOTIVOS_BLOCO_CONVENIO[b];
    }
    conteudos.push(conteudo);
  }

  const codigoBarras = conteudos.join("");
  const semDvGeral = codigoBarras.slice(0, 3) + codigoBarras.slice(4);
  const dvGeralEsperado = calcularDv(semDvGeral);
  const dvGeralInformado = Number(codigoBarras[3]);
  return dvGeralEsperado === dvGeralInformado ? null : "DV_GERAL_INVALIDO";
}

function reconstruirCodigoBarrasConvenio(linhaDigitavel: string): string {
  let codigoBarras = "";
  for (let b = 0; b < 4; b++) {
    codigoBarras += linhaDigitavel.slice(b * 12, b * 12 + 11);
  }
  return codigoBarras;
}

export function mascararLinhaDigitavel(raw: string): string {
  if (raw.length > TAMANHO_MAXIMO_FORMATO_VALIDO) {
    return raw;
  }
  if (raw.length === 44) {
    return agruparEmBlocos(raw, 11);
  }
  if (raw.length === 48) {
    return agruparEmBlocos(raw, 12);
  }
  return mascararBoletoBancario(raw);
}

function agruparEmBlocos(raw: string, tamanhoBloco: number): string {
  const blocos: string[] = [];
  for (let i = 0; i < raw.length; i += tamanhoBloco) {
    blocos.push(raw.slice(i, i + tamanhoBloco));
  }
  return blocos.join(" ");
}

function mascararBoletoBancario(raw: string): string {
  const campo1 = raw.slice(0, 10);
  const campo2 = raw.slice(10, 21);
  const campo3 = raw.slice(21, 32);
  const campo4 = raw.slice(32, 33);
  const campo5 = raw.slice(33, 47);

  return [
    formatarComPonto(campo1, 5),
    formatarComPonto(campo2, 5),
    formatarComPonto(campo3, 5),
    campo4,
    campo5,
  ]
    .filter((parte) => parte.length > 0)
    .join(" ");
}

function formatarComPonto(campo: string, posicaoPonto: number): string {
  if (campo.length <= posicaoPonto) {
    return campo;
  }
  return `${campo.slice(0, posicaoPonto)}.${campo.slice(posicaoPonto)}`;
}

export function extrairValorLocal(linhaDigitavel: string, formato: FormatoLinhaDigitavel): number | null {
  if (formato === "BOLETO") {
    return centavosParaReais(linhaDigitavel.slice(37, 47), 10);
  }
  if (formato === "CODIGO_DE_BARRAS") {
    return centavosParaReais(linhaDigitavel.slice(9, 19), 10);
  }
  if (formato === "CONVENIO") {
    // identificador "6"/"8" = valor efetivo em reais; "7"/"9" = quantidade
    // de moeda ou valor de referência a reajustar - não é um valor direto.
    if (linhaDigitavel[2] !== "6" && linhaDigitavel[2] !== "8") {
      return null;
    }
    const codigoBarras = reconstruirCodigoBarrasConvenio(linhaDigitavel);
    // campo de valor do convenio (posicoes 5-15 do codigo de barras) tem 11
    // digitos, um a mais que boleto/codigo de barras (10)
    return centavosParaReais(codigoBarras.slice(4, 15), 11);
  }
  return null;
}

function centavosParaReais(digitosValor: string, tamanhoEsperado: number): number | null {
  if (digitosValor.length !== tamanhoEsperado || !/^\d+$/.test(digitosValor)) {
    return null;
  }
  return Number(digitosValor) / 100;
}

export function rotuloTipo(formato: FormatoLinhaDigitavel): string | null {
  switch (formato) {
    case "BOLETO":
      return "Boleto bancário";
    case "CODIGO_DE_BARRAS":
      return "Código de barras";
    case "CONVENIO":
      return "Convênio/arrecadação";
    case "INVALIDO":
      return null;
  }
}
