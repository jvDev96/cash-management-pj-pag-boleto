import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { HistoricoPage } from './pages/HistoricoPage';
import { HistoricoDetalhePage } from './pages/HistoricoDetalhePage';
import { PagamentoPage } from './pages/PagamentoPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pagamento" element={<PagamentoPage />} />
        <Route path="/historico" element={<HistoricoPage />} />
        <Route path="/historico/:sagaId" element={<HistoricoDetalhePage />} />
      </Routes>
    </Layout>
  )
}

export default App
