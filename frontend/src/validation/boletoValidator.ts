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

// DECISAO: mascara aplicada sobre o valor JA sanitizado (so digitos), nunca
// sobre o que o usuario digitou na hora - o input sempre guarda/valida digito
// puro (useBoletoValidation), a mascara e so uma camada de apresentacao.
// PORQUE: separar "o dado" de "como ele aparece" evita que pontuacao de
// mascara vaze pra dentro da logica de validacao/envio.
export function mascararLinhaDigitavel(raw: string): string {
  if (raw.length > TAMANHO_MAXIMO_FORMATO_VALIDO) {
    return raw; // ja passou de qualquer formato valido - mostra cru, sem fingir agrupamento
  }
  if (raw.length === 44) {
    return agruparEmBlocos(raw, 11); // codigo de barras: 4 blocos de 11, como impresso sob o barcode
  }
  if (raw.length === 48) {
    return agruparEmBlocos(raw, 12); // convenio: 4 blocos de 12
  }
  return mascararBoletoBancario(raw); // formato "em progresso" e o final de 47 (boleto bancario, o mais comum)
}

function agruparEmBlocos(raw: string, tamanhoBloco: number): string {
  const blocos: string[] = [];
  for (let i = 0; i < raw.length; i += tamanhoBloco) {
    blocos.push(raw.slice(i, i + tamanhoBloco));
  }
  return blocos.join(" ");
}

// DECISAO: mascara do boleto bancario segue os limites de campo da FEBRABAN
// (Campo1 10, Campo2 11, Campo3 11, Campo4 1, Campo5 14), com "." separando
// os 5 primeiros digitos do DV de cada campo - mesmo agrupamento impresso no
// boleto de verdade.
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

// DECISAO: extrai o valor so quando o FORMATO ja e conhecido (length exato
// de 44 ou 47), independente do DV estar certo ainda.
// PORQUE: formato/posicao dos campos e uma propriedade ESTRUTURAL (so
// depende do tamanho), nao da validade do digito verificador - mostrar o
// valor reativamente, so-cliente, mesmo com uma linha ainda com DV errado
// (ou nem checado ainda) ajuda o usuario a perceber um erro de transcricao
// olhando pro valor que "nao bate" com o que ele esperava, sem esperar
// nem terminar de digitar nem uma chamada de rede.
// DECISAO: convenio (48 digitos) devolve null - diferente de boleto/codigo
// de barras, a posicao do valor no convenio NAO e fixa (depende de um
// digito identificador interno, mesma limitacao ja documentada pro DV de
// convenio) - extrair errado seria pior que nao mostrar nada.
export function extrairValorLocal(linhaDigitavel: string, formato: FormatoLinhaDigitavel): number | null {
  if (formato === "BOLETO") {
    // Campo5 (posicoes 33-47) = vencimento(4) + valor(10) - mesma posicao
    // (ultimos 10 digitos da linha inteira) usada em ConsultaBoletoService
    // no backend.
    return centavosParaReais(linhaDigitavel.slice(37, 47));
  }
  if (formato === "CODIGO_DE_BARRAS") {
    // codigo de barras: banco(3) + moeda(1) + DV(1) + vencimento(4) + valor(10) + campo-livre(25)
    return centavosParaReais(linhaDigitavel.slice(9, 19));
  }
  return null;
}

function centavosParaReais(digitosValor: string): number | null {
  if (!/^\d{10}$/.test(digitosValor)) {
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
