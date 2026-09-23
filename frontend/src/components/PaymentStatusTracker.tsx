import { montarTimeline } from "../timeline/montarTimeline";
import type { StatusLinha } from "../timeline/montarTimeline";
import type { HistoricoEntry, SagaState } from "../hooks/usePaymentSaga";
import { detectarFormato, rotuloTipo } from "../validation/boletoValidator";
import { detectarBanco } from "../validation/bancos";
import styles from "./PaymentStatusTracker.module.scss";

// DECISAO: campos nullable (nao um objeto opcional so por dentro).
// PORQUE: beneficiario/vencimento so vem preenchido depois que a etapa de
// validacao terminar (ver Saga.preencherDadosConsultados no backend) -
// mostrar "-" enquanto ainda nao chegou e melhor que esconder o card
// inteiro, que so teria valor/linhaDigitavel prontos desde o inicio.
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
  // DECISAO: opcional, nao obrigatorio.
  // PORQUE: evita forcar todo teste/consumidor existente a passar esse dado -
  // sem ele, o card de resumo do boleto simplesmente nao aparece, o resto do
  // componente funciona igual antes.
  boleto?: DadosBoleto;
};

export function PaymentStatusTracker({ estado, historico, protocolo, motivoFalha, boleto }: PaymentStatusTrackerProps) {
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
      {boleto && (
        // DECISAO: resumo do boleto entra AQUI, dentro do tracker - nao num
        // componente separado ao lado.
        // PORQUE: pedido explicito - sem isso, tanto o acompanhamento ao
        // vivo quanto a consulta de um item do historico mostram só a
        // timeline de estados, sem dizer DE QUAL boleto se trata. Reusa
        // detectarBanco/detectarFormato (mesma logica ja usada no
        // BoletoInput) em vez de esperar o backend mandar banco/tipo prontos -
        // os dois so dependem da linhaDigitavel, que ja vem no dado.
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

function formatarValor(valor: number | null): string {
  if (valor === null) {
    return "—";
  }
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

// DECISAO: constroi a Date a partir de ano/mes/dia separados, nao de
// new Date(dataIsoCompleta) - mesmo motivo do PaymentReviewCard (evita o
// bug de "voltar um dia" por interpretar a data como meia-noite UTC).
function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
}
