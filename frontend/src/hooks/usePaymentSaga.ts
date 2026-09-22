import { useEffect, useRef, useState } from "react";
import { BASE_URL } from "../api/config";

export type SagaState =
  | "RECEBIDO"
  | "VALIDADO"
  | "SALDO_RESERVADO"
  | "LIQUIDACAO_ENVIADA"
  | "CONCLUIDO"
  | "SALDO_LIBERADO"
  | "REJEITADO"
  | "FALHOU";

  export type HistoricoEntry = {
  estado: SagaState;
  timestamp: string;
};

type PagamentoResponse = {
  sagaId: string;
  estado: SagaState;
  motivoFalha: string | null;
  atualizadoEm: string;
  historico: HistoricoEntry[];
};

const ESTADOS_TERMINAIS: SagaState[] = ["CONCLUIDO", "REJEITADO", "FALHOU"];
const INTERVALO_POLLING_MS = 1500;

export function usePaymentSaga() {
  const idempotencyKeyRef = useRef<string | null>(null);
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current = crypto.randomUUID();
  }

  const [sagaId, setSagaId] = useState<string | null>(null);
  const [estado, setEstado] = useState<SagaState | null>(null);
  const [motivoFalha, setMotivoFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(false);
  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);

  const enviarPagamento = (linhaDigitavel: string, valor: number) => {
    setEnviando(true);
    setErro(false);

    fetch(`${BASE_URL}/pagamentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKeyRef.current!,
      },
      body: JSON.stringify({ linhaDigitavel, valor }),
    })
      .then((res) => res.json())
      .then((dados: PagamentoResponse) => {
        setSagaId(dados.sagaId);
        setEstado(dados.estado);
        setMotivoFalha(dados.motivoFalha);
        setEnviando(false);
        setHistorico(dados.historico);
      })
      .catch(() => {
        setErro(true);
        setEnviando(false);
      });
  };

  useEffect(() => {
    if (!sagaId) {
      return;
    }

    const intervalId = setInterval(() => {
      fetch(`${BASE_URL}/pagamentos/${sagaId}`)
        .then((res) => res.json())
        .then((dados: PagamentoResponse) => {
          setEstado(dados.estado);
          setMotivoFalha(dados.motivoFalha);
          setHistorico(dados.historico);

          if (ESTADOS_TERMINAIS.includes(dados.estado)) {
            clearInterval(intervalId);
          }
        })
        // DECISAO: falha pontual de rede so loga, nao para o polling nem seta erro.
        // PORQUE: um hiccup de rede no meio do polling nao deveria derrubar a
        // tentativa inteira - a proxima iteracao do intervalo tenta de novo.
        .catch((e) => {
          console.error("Falha ao consultar status do pagamento", e);
        });
    }, INTERVALO_POLLING_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [sagaId]);

  return { sagaId, estado, motivoFalha, enviando, erro, historico, enviarPagamento };
}
