import { describe, expect, it } from "vitest";
import { detectarFormato, validarLinhaDigitavel } from "./boletoValidator";


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
    });
  });

  it("um digito adulterado no campo 1 -> invalido", () => {
    const linhaAdulterada = "9" + linhaValida.slice(1);
    expect(validarLinhaDigitavel(linhaAdulterada)).toEqual({
      valido: false,
      formato: "BOLETO",
    });
  });
});