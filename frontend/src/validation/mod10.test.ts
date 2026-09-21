import { describe, expect, it } from "vitest";
import { calcularMod10 } from "./mod10";

// DECISAO: casos de teste construidos pra dar pra conferir na mao, digito a
// digito, em vez de um numero de boleto "real" decorado que eu nao teria
// como garantir que esta certo. Cada caso isola um comportamento especifico
// do algoritmo.
describe("calcularMod10", () => {
  it("todos zeros -> soma zero -> DV e 0 (caso especial)", () => {
    expect(calcularMod10("000000000")).toBe(0);
  });

  it("um unico digito 1 na ultima posicao (multiplicador 2, sem estourar 10)", () => {
    // ultimo digito (multiplicador 2) = 1 -> produto = 2 -> soma = 2
    // resto = 2, DV = 10 - 2 = 8
    expect(calcularMod10("000000001")).toBe(8);
  });

  it("um unico digito 9 na ultima posicao (produto estoura 10, soma os algarismos)", () => {
    // ultimo digito (multiplicador 2) = 9 -> produto = 18 -> 1+8 = 9 -> soma = 9
    // resto = 9, DV = 10 - 9 = 1
    expect(calcularMod10("000000009")).toBe(1);
  });

  it("adulterar um digito muda o DV calculado", () => {
    const original = calcularMod10("123456780");
    const adulterado = calcularMod10("123456781");
    expect(original).not.toBe(adulterado);
  });
});
