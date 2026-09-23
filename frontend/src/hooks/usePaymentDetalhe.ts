import { useEffect, useState } from "react";
import { BASE_URL } from "../api/config";
import type { HistoricoEntry, SagaState } from "./usePaymentSaga";

type PagamentoDetalhe = {
  sagaId: string;
  estado: SagaState;
  motivoFalha: string | null;
  protocolo: string | null;
  historico: HistoricoEntry[];
  beneficiario: string | null;
  valor: number | null;
  vencimento: string | null;
  linhaDigitavel: string | null;
};

const ESTADOS_TERMINAIS: SagaState[] = ["CONCLUIDO", "REJEITADO", "FALHOU"];
const INTERVALO_POLLING_MS = 1500;

export function usePaymentDetalhe(sagaId: string) {
  const [dados, setDados] = useState<PagamentoDetalhe | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    setDados(null);
    setErro(false);

    const buscarUmaVez = (aoReceber: (estado: SagaState) => void) => {
      fetch(`${BASE_URL}/pagamentos/${sagaId}`)
        .then((res) => res.json())
        .then((recebido: PagamentoDetalhe) => {
          setDados(recebido);
          aoReceber(recebido.estado);
        })
        .catch(() => setErro(true));
    };

    let intervalId: number | undefined;
    buscarUmaVez((estado) => {
      if (ESTADOS_TERMINAIS.includes(estado)) {
        return;
      }
      intervalId = window.setInterval(() => {
        buscarUmaVez((estadoAtual) => {
          if (ESTADOS_TERMINAIS.includes(estadoAtual)) {
            clearInterval(intervalId);
          }
        });
      }, INTERVALO_POLLING_MS);
    });

    return () => clearInterval(intervalId);
  }, [sagaId]);

  return { dados, erro };
}
