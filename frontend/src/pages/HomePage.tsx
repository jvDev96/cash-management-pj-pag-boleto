import { Link, useSearchParams } from 'react-router-dom'
import { PagamentoPage } from './PagamentoPage'
import { HistoricoPage } from './HistoricoPage'
import { HistoricoDetalhePage } from './HistoricoDetalhePage'
import { AutodepositoPage } from './AutodepositoPage'
import styles from './HomePage.module.scss'

type Visao = 'pagamento' | 'historico' | 'autodeposito' | null

// DECISAO: pagina unica - os 3 cards ficam sempre visiveis, o conteudo
// abaixo troca via query param (?view=...), nao via rota separada.
// PORQUE: pedido explicito de navegacao "full SPA" sem sair da tela - o
// usuario nunca perde a visao geral (cards) pra entrar numa sub-tela. Query
// param em vez de useState local: mantem back/forward do navegador
// funcionando, e a URL continua compartilhavel/atualizavel (ex: um link
// direto pro Autodeposito), sem precisar de rotas de caminho separadas.
export function HomePage() {
  const [searchParams] = useSearchParams()
  const visao = searchParams.get('view') as Visao
  const sagaId = searchParams.get('saga')

  return (
    <div>
      <h1 className={styles.titulo}>Visão Geral</h1>
      <p className={styles.subtitulo}>Acompanhe seus pagamentos</p>
      <nav className={styles.nav}>
        <Link
          to="/?view=pagamento"
          className={`${styles.card} ${styles.cardPrimario} ${visao === 'pagamento' ? styles.cardAtivo : ''}`}
        >
          <h2 className={styles.cardTitulo}>Realizar Novo Pagamento</h2>
          <p className={styles.cardDescricao}>Pagar boleto ou código de barras</p>
        </Link>
        <Link
          to="/?view=historico"
          className={`${styles.card} ${styles.cardSecundario} ${visao === 'historico' ? styles.cardAtivo : ''}`}
        >
          <h2 className={styles.cardTitulo}>Ver Histórico de Pagamentos</h2>
          <p className={styles.cardDescricao}>Consultar comprovantes e status</p>
        </Link>
        <Link
          to="/?view=autodeposito"
          className={`${styles.card} ${styles.cardSecundario} ${visao === 'autodeposito' ? styles.cardAtivo : ''}`}
        >
          <h2 className={styles.cardTitulo}>Autodepósito</h2>
          <p className={styles.cardDescricao}>Colocar saldo na conta</p>
        </Link>
      </nav>

      {visao && (
        <div className={styles.conteudoVisao}>
          {visao === 'pagamento' && <PagamentoPage />}
          {visao === 'historico' && !sagaId && <HistoricoPage />}
          {visao === 'historico' && sagaId && <HistoricoDetalhePage sagaId={sagaId} />}
          {visao === 'autodeposito' && <AutodepositoPage />}
        </div>
      )}
    </div>
  )
}
