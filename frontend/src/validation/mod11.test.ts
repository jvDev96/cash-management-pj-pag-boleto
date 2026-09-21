import { describe, expect, it } from "vitest";
import { calcularMod11 } from "./mod11";

describe("calcularMod11", () => {
  it("todos zeros -> resto 0 -> DV vira 11, mas a regra especial converte pra 1", () => {
    expect(calcularMod11("000000000")).toBe(1);
  });

  it("digito na posicao de peso 9 (8a casa da direita pra esquerda)", () => {
    // "010000000": o unico digito != 0 fica na posicao onde o peso e 9
    // produto = 1*9 = 9 -> soma = 9 -> resto = 9 -> DV = 11-9 = 2
    expect(calcularMod11("010000000")).toBe(2);
  });

  it("digito na posicao seguinte ao peso 9 -> peso volta pra 2 (fecha o ciclo)", () => {
    // "100000000": o unico digito != 0 fica uma casa a mais a esquerda -
    // o peso ja deu a volta de 9 de volta pra 2
    // produto = 1*2 = 2 -> soma = 2 -> resto = 2 -> DV = 11-2 = 9
    expect(calcularMod11("100000000")).toBe(9);
  });

  it("adulterar um digito muda o DV calculado", () => {
    const original = calcularMod11("123456780");
    const adulterado = calcularMod11("123456781");
    expect(original).not.toBe(adulterado);
  });
});
