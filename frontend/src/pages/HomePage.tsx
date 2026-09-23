import { Link } from 'react-router-dom'
import styles from './HomePage.module.scss'

export function HomePage() {
  return (
    <div>
      <h1 className={styles.titulo}>Visão Geral</h1>
      <p className={styles.subtitulo}>Acompanhe seus pagamentos</p>
      <nav className={styles.nav}>
        <Link to="/pagamento" className={`${styles.card} ${styles.cardPrimario}`}>
          <h2 className={styles.cardTitulo}>Realizar Novo Pagamento</h2>
          <p className={styles.cardDescricao}>Pagar boleto ou código de barras</p>
        </Link>
        <Link to="/historico" className={`${styles.card} ${styles.cardSecundario}`}>
          <h2 className={styles.cardTitulo}>Ver Histórico de Pagamentos</h2>
          <p className={styles.cardDescricao}>Consultar comprovantes e status</p>
        </Link>
        <Link to="/autodeposito" className={`${styles.card} ${styles.cardSecundario}`}>
          <h2 className={styles.cardTitulo}>Autodepósito</h2>
          <p className={styles.cardDescricao}>Colocar saldo na conta</p>
        </Link>
      </nav>
    </div>
  )
}
