import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'

// DECISAO: uma unica rota (/) - as outras telas nao sao mais paginas
// proprias, viraram secoes que a HomePage renderiza condicionalmente por
// query param. O catch-all redireciona qualquer caminho antigo (ex: um
// favorito salvo com /pagamento de antes desse refactor) de volta pra raiz,
// em vez de dar tela em branco/404.
function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
