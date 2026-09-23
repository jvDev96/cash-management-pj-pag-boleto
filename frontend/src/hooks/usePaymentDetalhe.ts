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

// DECISAO: hook separado de usePaymentSaga, nao reaproveitado direto.
// PORQUE: usePaymentSaga tambem gerencia o ENVIO de um pagamento novo
// (idempotency key, enviarPagamento, reiniciar) - esse aqui so CONSULTA um
// sagaId que ja existe, vindo do historico (clique na lista). Misturar os
// dois infla o hook original com estado que essa tela nunca usa - mesmo
// principio de SagaOrchestrator vs SagaTimeoutScheduler (gatilhos/casos de
// uso diferentes, classes/hooks separados mesmo compartilhando o formato).
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

    // DECISAO: so entra em polling se a primeira consulta vier NAO terminal.
    // PORQUE: a maioria dos itens de historico ja esta num estado terminal
    // (pagamento passado) - poucos vao precisar de acompanhamento ao vivo, e
    // nesses raros casos (pagamento ainda em andamento, clicado no historico
    // logo apos enviar) o polling entra automaticamente.
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
