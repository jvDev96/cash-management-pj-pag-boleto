import { describe, expect, it } from "vitest";
import { detectarBanco } from "./bancos";

describe("detectarBanco", () => {
  it("banco reconhecido pelos 3 primeiros digitos (boleto/codigo de barras)", () => {
    expect(detectarBanco("34191791234567890123456789012345678901234561")).toBe("Itaú Unibanco");
  });

  it("codigo de 3 digitos nao reconhecido -> null", () => {
    expect(detectarBanco("99991791234567890123456789012345678901234561")).toBeNull();
  });

  it("menos de 3 digitos -> null", () => {
    expect(detectarBanco("34")).toBeNull();
  });

  it("convenio (48 digitos) -> null, mesmo comecando com um prefixo que existiria em BANCOS", () => {
    // convenio nao tem "banco emissor" - os 3 primeiros digitos ali sao
    // produto+segmento+identificador (Layout FEBRABAN de Arrecadacao), nao
    // um codigo de banco. 48 digitos sempre retorna null, sem nem olhar
    // pra tabela de bancos.
    expect(detectarBanco("818530741850296307418526963074185298630741852969")).toBeNull();
  });
});
