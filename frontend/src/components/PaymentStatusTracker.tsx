import { montarTimeline } from "../timeline/montarTimeline";
import type { StatusLinha } from "../timeline/montarTimeline";
import type { HistoricoEntry, SagaState } from "../hooks/usePaymentSaga";
import { detectarFormato, rotuloTipo } from "../validation/boletoValidator";
import { detectarBanco } from "../validation/bancos";
import styles from "./PaymentStatusTracker.module.scss";

export type DadosBoleto = {
  beneficiario: string | null;
  valor: number | null;
  vencimento: string | null;
  linhaDigitavel: string | null;
};

type PaymentStatusTrackerProps = {
  estado: SagaState | null;
  historico: HistoricoEntry[];
  motivoFalha: string | null;
  protocolo: string | null;
  boleto?: DadosBoleto;
};

export function PaymentStatusTracker({ estado, historico, protocolo, motivoFalha, boleto }: PaymentStatusTrackerProps) {
  const linhas = montarTimeline(estado, historico, motivoFalha);

  if (linhas.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.titulo}>Acompanhamento do Pagamento</h2>
      <p className={styles.subtitulo}>Atualizado em tempo real</p>
      {boleto && (
        <dl className={styles.resumoBoleto}>
          <dt>Beneficiário</dt>
          <dd>{boleto.beneficiario ?? "—"}</dd>
          <dt>Valor</dt>
          <dd>{formatarValor(boleto.valor)}</dd>
          <dt>Vencimento</dt>
          <dd>{boleto.vencimento ? formatarData(boleto.vencimento) : "—"}</dd>
          <dt>Tipo</dt>
          <dd>{(boleto.linhaDigitavel && rotuloTipo(detectarFormato(boleto.linhaDigitavel))) ?? "—"}</dd>
          <dt>Banco</dt>
          <dd>{(boleto.linhaDigitavel && detectarBanco(boleto.linhaDigitavel)) ?? "Não identificado"}</dd>
        </dl>
      )}
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

function formatarValor(valor: number | null): string {
  if (valor === null) {
    return "—";
  }
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
}
