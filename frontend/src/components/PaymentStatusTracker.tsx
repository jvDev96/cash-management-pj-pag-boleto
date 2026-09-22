import { montarTimeline } from "../timeline/montarTimeline";
import type { StatusLinha } from "../timeline/montarTimeline";
import type { HistoricoEntry, SagaState } from "../hooks/usePaymentSaga";

type PaymentStatusTrackerProps = {
  estado: SagaState | null;
  historico: HistoricoEntry[];
  motivoFalha: string | null;
  protocolo: string | null;
};

export function PaymentStatusTracker({ estado, historico, protocolo, motivoFalha }: PaymentStatusTrackerProps) {
  const linhas = montarTimeline(estado, historico, motivoFalha);

  // DECISAO: sem pagamento em andamento (estado null), nao renderiza nada.
  // PORQUE: essa tela so faz sentido depois que o usuario confirmou um
  // pagamento - montarTimeline ja devolve [] nesse caso, entao so refletimos
  // isso no componente.
  if (linhas.length === 0) {
    return null;
  }

  return (
    <div>
      <h2>Acompanhamento do Pagamento</h2>
      <p>Atualizado em tempo real</p>
      <ol>
        {linhas.map((linha) => (
          <li key={linha.id}>
            <span aria-hidden="true">{iconePorStatus(linha.status)}</span>
            <strong>{linha.titulo}</strong>
            <p>{linha.descricao}</p>
            {linha.status === "processando" && <p>Processando...</p>}
            {linha.timestamp && <time>{formatarHorario(linha.timestamp)}</time>}
            {linha.motivoFalha && (
              <div role="alert">
                <strong>MOTIVO DA FALHA</strong>
                <p>{linha.motivoFalha}</p>
              </div>
            )}
            {linha.id === "RESULTADO" && linha.status === "concluido" && protocolo && (
              <p>Protocolo: {protocolo}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// DECISAO: helpers privados (sem export), so usados por este componente.
// PORQUE: nao ha outro consumidor hoje - mesma regra do MAX_LENGTH_INPUT no
// BoletoInput, nao promove pra arquivo/export publico sem necessidade real.
function iconePorStatus(status: StatusLinha): string {
  switch (status) {
    case "concluido":
      return "✓";
    case "processando":
      return "●";
    case "falhou":
      return "✕";
    case "pendente":
      return "○";
  }
}

function formatarHorario(timestampIso: string): string {
  return new Date(timestampIso).toLocaleTimeString("pt-BR");
}