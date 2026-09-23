import { useParams } from "react-router-dom";
import { usePaymentDetalhe } from "../hooks/usePaymentDetalhe";
import { PaymentStatusTracker } from "../components/PaymentStatusTracker";
import { BotaoVoltar } from "../components/BotaoVoltar";
import styles from "./PagamentoPage.module.scss";

// DECISAO: reaproveita PagamentoPage.module.scss, nao cria um arquivo de
// estilo proprio.
// PORQUE: e visualmente a MESMA tela de acompanhamento (BotaoVoltar + titulo
// + PaymentStatusTracker) que PagamentoPage mostra depois de enviar um
// pagamento - so a origem dos dados muda (aqui vem de um sagaId existente no
// historico, la vem de um pagamento acabado de criar). Criar um SCSS
// duplicado só pra isso repetiria classe por classe sem nenhuma diferença
// visual real.
export function HistoricoDetalhePage() {
  const { sagaId } = useParams<{ sagaId: string }>();
  const { dados, erro } = usePaymentDetalhe(sagaId ?? "");

  return (
    <div className={styles.pagina}>
      <BotaoVoltar />
      <h1 className={styles.titulo}>Detalhe do Pagamento</h1>
      <p className={styles.subtitulo}>Acompanhamento desse pagamento, a partir do histórico</p>
      {erro && (
        <p role="alert" className={styles.erro}>
          Não foi possível carregar esse pagamento.
        </p>
      )}
      {dados && (
        <PaymentStatusTracker
          estado={dados.estado}
          historico={dados.historico}
          motivoFalha={dados.motivoFalha}
          protocolo={dados.protocolo}
        />
      )}
    </div>
  );
}
