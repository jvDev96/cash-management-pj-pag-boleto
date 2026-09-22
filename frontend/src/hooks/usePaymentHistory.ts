import { useEffect, useState } from "react";
import { BASE_URL } from "../api/config";
import type { SagaState } from "./usePaymentSaga";

export type PagamentoResumo = {
  sagaId: string;
  beneficiario: string | null;
  valor: number;
  estado: SagaState;
  atualizadoEm: string;
};

type PaginaPagamentos = {
  content: PagamentoResumo[];
  totalPages: number;
  totalElements: number;
  number: number;
};

// DECISAO: mesmo padrao do useBoletoPreview - useEffect + AbortController.
// PORQUE: trocar de pagina rapido (proximo/anterior varias vezes) tem o
// mesmo risco de condicao de corrida - resposta antiga chegando depois da
// mais nova e sobrescrevendo o estado com a pagina errada.
export function usePaymentHistory() {
  const [pagina, setPagina] = useState(0);
  const [dados, setDados] = useState<PaginaPagamentos | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro(false);

    fetch(`${BASE_URL}/pagamentos?page=${pagina}&size=10`, { signal: controller.signal })
      .then((res) => res.json())
      .then((dadosRecebidos: PaginaPagamentos) => {
        setDados(dadosRecebidos);
        setCarregando(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") {
          return;
        }
        setErro(true);
        setCarregando(false);
      });

    return () => {
      controller.abort();
    };
  }, [pagina]);

  return {
    pagamentos: dados?.content ?? [],
    paginaAtual: pagina,
    totalPaginas: dados?.totalPages ?? 0,
    carregando,
    erro,
    irParaPagina: setPagina,
  };
}
