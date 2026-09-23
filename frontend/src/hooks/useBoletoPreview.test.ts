import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBoletoPreview, type BoletoPreview } from "./useBoletoPreview";

const previewMock: BoletoPreview = {
  encontrado: true,
  beneficiario: "Empresa Teste LTDA",
  valor: 100,
  vencimento: "2026-10-01",
  tipo: "Boleto bancario",
  banco: "Itau",
  motivoFalha: null,
  sagaExistente: null,
  estadoSagaExistente: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useBoletoPreview", () => {
    it("nao busca nada quando invalido", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useBoletoPreview("", false));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("busca o preview quando valido, e atualiza o estado", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(previewMock),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useBoletoPreview("1".repeat(47), true));

    expect(result.current.carregando).toBe(true);

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    expect(result.current.preview).toEqual(previewMock);
  });

   it("marca erro quando o fetch falha de verdade (nao cancelamento)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("falha de rede"));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useBoletoPreview("1".repeat(47), true));

    await waitFor(() => {
      expect(result.current.erro).toBe(true);
    });

    expect(result.current.preview).toBeNull();
    expect(result.current.carregando).toBe(false);
  });
});