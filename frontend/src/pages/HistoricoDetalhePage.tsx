import { Link } from "react-router-dom";
import { usePaymentDetalhe } from "../hooks/usePaymentDetalhe";
import { PaymentStatusTracker } from "../components/PaymentStatusTracker";
import styles from "./PagamentoPage.module.scss";

type HistoricoDetalhePageProps = {
  sagaId: string;
};

// DECISAO: recebe sagaId por PROP, nao mais por useParams() de rota.
// PORQUE: essa tela agora e renderizada dentro da HomePage (view=historico
// &saga=...), nao numa rota propria - o sagaId ja vem lido do query param
// um nivel acima, no componente pai.
// DECISAO: reaproveita PagamentoPage.module.scss, nao cria um arquivo de
// estilo proprio - e visualmente a MESMA tela de acompanhamento.
export function HistoricoDetalhePage({ sagaId }: HistoricoDetalhePageProps) {
  const { dados, erro } = usePaymentDetalhe(sagaId);

  return (
    <div className={styles.pagina}>
      <Link to="/?view=historico" className={styles.voltarLista}>
        ← Voltar à lista
      </Link>
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
          boleto={{
            beneficiario: dados.beneficiario,
            valor: dados.valor,
            vencimento: dados.vencimento,
            linhaDigitavel: dados.linhaDigitavel,
          }}
        />
      )}
    </div>
  );
}
