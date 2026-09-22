import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePaymentHistory } from "./usePaymentHistory";

const paginaMock = {
  content: [
    { sagaId: "abc", beneficiario: "Empresa Teste", valor: 100, estado: "CONCLUIDO", atualizadoEm: "2026-09-20T10:00:00Z" },
  ],
  totalPages: 3,
  totalElements: 25,
  number: 0,
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePaymentHistory", () => {
  it("busca a pagina 0 automaticamente ao montar", async () => {
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(paginaMock) });

    const { result } = renderHook(() => usePaymentHistory());

    expect(result.current.carregando).toBe(true);

    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    expect(result.current.pagamentos).toEqual(paginaMock.content);
    expect(result.current.totalPaginas).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("page=0"),
      expect.anything()
    );
  });

  it("troca de pagina ao chamar irParaPagina", async () => {
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(paginaMock) });

    const { result } = renderHook(() => usePaymentHistory());
    await waitFor(() => expect(result.current.carregando).toBe(false));

    act(() => {
      result.current.irParaPagina(1);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("page=1"),
        expect.anything()
      );
    });
  });
});
