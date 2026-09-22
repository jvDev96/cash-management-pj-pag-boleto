import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div>
      <h1>Visão Geral</h1>
      <p>Acompanhe seus pagamentos</p>
      <nav>
        <Link to="/pagamento">
          <h2>Realizar Novo Pagamento</h2>
          <p>Pagar boleto ou código de barras</p>
        </Link>
        <Link to="/historico">
          <h2>Ver Histórico de Pagamentos</h2>
          <p>Consultar comprovantes e status</p>
        </Link>
      </nav>
    </div>
  )
}
