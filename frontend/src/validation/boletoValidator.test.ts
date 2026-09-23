import { describe, expect, it } from "vitest";
import {
  detectarFormato,
  extrairValorLocal,
  mascararLinhaDigitavel,
  validarLinhaDigitavel,
} from "./boletoValidator";


describe("detectarFormato", () => {
  it("44 digitos -> codigo de barras", () => {
    expect(detectarFormato("1".repeat(44))).toBe("CODIGO_DE_BARRAS");
  });

  it("47 digitos -> boleto", () => {
    expect(detectarFormato("1".repeat(47))).toBe("BOLETO");
  });

  it("48 digitos -> convenio", () => {
    expect(detectarFormato("1".repeat(48))).toBe("CONVENIO");
  });

  it("tamanho fora do esperado -> invalido", () => {
    expect(detectarFormato("1".repeat(46))).toBe("INVALIDO");
  });

  it("string vazia -> invalido", () => {
    expect(detectarFormato("")).toBe("INVALIDO");
  });
});

describe("validarLinhaDigitavel - boleto bancario", () => {
  const linhaValida = "34191111112222233333244444555559599990000010000";

  it("linha valida (todos os DVs batendo) -> valido", () => {
    expect(validarLinhaDigitavel(linhaValida)).toEqual({
      valido: true,
      formato: "BOLETO",
      motivo: null,
    });
  });

  it("um digito adulterado no campo 1 -> invalido", () => {
    const linhaAdulterada = "9" + linhaValida.slice(1);
    expect(validarLinhaDigitavel(linhaAdulterada)).toEqual({
      valido: false,
      formato: "BOLETO",
      motivo: "DV_BLOCO_1_INVALIDO",
    });
  });
});

describe("validarLinhaDigitavel - convenio/arrecadacao", () => {
  // identificador (posicao 3) = "8" -> modulo 11 (bloco/geral)
  const linhaMod11 = "818530741850296307418526963074185298630741852969";
  // identificador (posicao 3) = "6" -> modulo 10 (bloco/geral)
  const linhaMod10 = "826052963079418529630745185296307415852963074186";

  it("linha valida usando modulo 11 (identificador 8/9) -> valido", () => {
    expect(validarLinhaDigitavel(linhaMod11)).toEqual({
      valido: true,
      formato: "CONVENIO",
      motivo: null,
    });
  });

  it("linha valida usando modulo 10 (identificador 6/7) -> valido", () => {
    expect(validarLinhaDigitavel(linhaMod10)).toEqual({
      valido: true,
      formato: "CONVENIO",
      motivo: null,
    });
  });

  it("digito adulterado dentro do 1o bloco -> DV_BLOCO_1_INVALIDO", () => {
    const adulterada = "9" + linhaMod11.slice(1);
    expect(validarLinhaDigitavel(adulterada)).toEqual({
      valido: false,
      formato: "CONVENIO",
      motivo: "DV_BLOCO_1_INVALIDO",
    });
  });

  it("DV geral adulterado (blocos batendo, DV geral nao) -> DV_GERAL_INVALIDO", () => {
    const adulterada = "818630741852296307418526963074185298630741852969";
    expect(validarLinhaDigitavel(adulterada)).toEqual({
      valido: false,
      formato: "CONVENIO",
      motivo: "DV_GERAL_INVALIDO",
    });
  });
});

describe("extrairValorLocal - convenio/arrecadacao", () => {
  const linhaMod11 = "818530741850296307418526963074185298630741852969";
  const linhaMod10 = "826052963079418529630745185296307415852963074186";

  it("identificador de valor efetivo (8) -> extrai valor em reais", () => {
    expect(extrairValorLocal(linhaMod11, "CONVENIO")).toBe(307418529.63);
  });

  it("identificador de valor efetivo (6) -> extrai valor em reais", () => {
    expect(extrairValorLocal(linhaMod10, "CONVENIO")).toBe(529630741.85);
  });

  it("identificador de quantidade/referencia (7 ou 9) -> nao e valor direto, retorna null", () => {
    // posicao 3 (indice 2) e o identificador; extrairValorLocal so le os
    // digitos, nao valida DV, entao trocar so esse digito basta pro teste
    const linhaReferencia = linhaMod11.slice(0, 2) + "9" + linhaMod11.slice(3);
    expect(extrairValorLocal(linhaReferencia, "CONVENIO")).toBeNull();
  });
});

describe("mascararLinhaDigitavel", () => {
  it("44 digitos -> 4 blocos de 11 (codigo de barras)", () => {
    expect(mascararLinhaDigitavel("1".repeat(44))).toBe(
      "11111111111 11111111111 11111111111 11111111111"
    );
  });

  it("48 digitos -> 4 blocos de 12 (convenio)", () => {
    expect(mascararLinhaDigitavel("1".repeat(48))).toBe(
      "111111111111 111111111111 111111111111 111111111111"
    );
  });

  it("47 digitos -> campos FEBRABAN do boleto bancario (10.11.11.1.14)", () => {
    const linha = "34191111112222233333244444555559599990000010000".slice(0, 47);
    expect(mascararLinhaDigitavel(linha)).toBe(
      "34191.11111 22222.333332 44444.555559 5 99990000010000"
    );
  });

  it("em progresso (menos de 44 digitos) -> agrupa como boleto parcial, sem quebrar", () => {
    expect(mascararLinhaDigitavel("341911111")).toBe("34191.1111");
  });

  it("string vazia -> string vazia", () => {
    expect(mascararLinhaDigitavel("")).toBe("");
  });

  it("mais digitos que o maior formato valido (48) -> mostra cru, sem fingir agrupamento", () => {
    const raw = "1".repeat(50);
    expect(mascararLinhaDigitavel(raw)).toBe(raw);
  });
});