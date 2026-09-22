import { Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { HistoricoPage } from './pages/HistoricoPage';
import { PagamentoPage } from './pages/PagamentoPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/pagamento" element={<PagamentoPage />} />
      <Route path="/historico" element={<HistoricoPage />} />
    </Routes>
  )
}

export default App
