import { montarTimeline } from "../timeline/montarTimeline";
import type { StatusLinha } from "../timeline/montarTimeline";
import type { HistoricoEntry, SagaState } from "../hooks/usePaymentSaga";
import styles from "./PaymentStatusTracker.module.scss";

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
    <div className={styles.container}>
      <h2 className={styles.titulo}>Acompanhamento do Pagamento</h2>
      <p className={styles.subtitulo}>Atualizado em tempo real</p>
      <ol className={styles.lista}>
        {linhas.map((linha) => (
          <li key={linha.id} className={styles.item}>
            <span aria-hidden="true" className={`${styles.icone} ${classePorStatus(linha.status)}`}>
              {iconePorStatus(linha.status)}
            </span>
            <div className={styles.corpo}>
              <div className={styles.linhaTitulo}>
                <strong className={styles.tituloEtapa}>{linha.titulo}</strong>
                {linha.timestamp && <time className={styles.horario}>{formatarHorario(linha.timestamp)}</time>}
              </div>
              <p className={styles.descricao}>{linha.descricao}</p>
              {linha.status === "processando" && <p className={styles.processando}>Processando...</p>}
              {linha.motivoFalha && (
                <div role="alert" className={styles.alerta}>
                  <strong className={styles.alertaTitulo}>MOTIVO DA FALHA</strong>
                  <p className={styles.alertaTexto}>{linha.motivoFalha}</p>
                </div>
              )}
              {linha.id === "RESULTADO" && linha.status === "concluido" && protocolo && (
                <p className={styles.protocolo}>Protocolo: {protocolo}</p>
              )}
            </div>
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

function classePorStatus(status: StatusLinha): string {
  switch (status) {
    case "concluido":
      return styles.iconeConcluido;
    case "processando":
      return styles.iconeProcessando;
    case "falhou":
      return styles.iconeFalhou;
    case "pendente":
      return "";
  }
}

function formatarHorario(timestampIso: string): string {
  return new Date(timestampIso).toLocaleTimeString("pt-BR");
}
