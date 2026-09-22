import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePaymentSaga } from "./usePaymentSaga";

const respostaPagamento = {
  sagaId: "abc-123",
  estado: "RECEBIDO",
  motivoFalha: null,
  atualizadoEm: "2026-09-21T10:00:00Z",
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers(); // rede de seguranca, mesmo se um assert anterior falhar
});

describe("usePaymentSaga", () => {
  it("envia o pagamento e guarda sagaId/estado retornados", async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve(respostaPagamento),
    });

    const { result } = renderHook(() => usePaymentSaga());

    act(() => {
      result.current.enviarPagamento("1".repeat(47), 100);
    });

    expect(result.current.enviando).toBe(true);

    await waitFor(() => {
      expect(result.current.enviando).toBe(false);
    });

    expect(result.current.sagaId).toBe("abc-123");
    expect(result.current.estado).toBe("RECEBIDO");
  });

  it("marca erro quando o envio falha", async () => {
    fetchMock.mockRejectedValue(new Error("rede fora do ar"));

    const { result } = renderHook(() => usePaymentSaga());

    act(() => {
      result.current.enviarPagamento("1".repeat(47), 100);
    });

    await waitFor(() => {
      expect(result.current.erro).toBe(true);
    });

    expect(result.current.enviando).toBe(false);
  });

  it("envia a Idempotency-Key no header da requisicao", async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve(respostaPagamento),
    });

    const { result } = renderHook(() => usePaymentSaga());

    act(() => {
      result.current.enviarPagamento("1".repeat(47), 100);
    });

    await waitFor(() => expect(result.current.enviando).toBe(false));

    const [, opcoes] = fetchMock.mock.calls[0];
    expect(opcoes.headers["Idempotency-Key"]).toBeTruthy();
  });
});

describe("usePaymentSaga — polling", () => {
  it("faz polling e para quando chega num estado terminal", async () => {
    vi.useFakeTimers();

    fetchMock
      .mockResolvedValueOnce({ json: () => Promise.resolve(respostaPagamento) }) // POST
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ ...respostaPagamento, estado: "VALIDADO" }),
      }) // 1a consulta de status
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ ...respostaPagamento, estado: "CONCLUIDO" }),
      }); // 2a consulta - terminal

    const { result } = renderHook(() => usePaymentSaga());

    await act(async () => {
      result.current.enviarPagamento("1".repeat(47), 100);
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.sagaId).toBe("abc-123");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(result.current.estado).toBe("VALIDADO");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(result.current.estado).toBe("CONCLUIDO");

    // avanca mais um ciclo inteiro - se o polling nao tivesse parado,
    // essa seria a 4a chamada de fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});