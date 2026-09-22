import { useNavigate } from 'react-router-dom'
import { useBoletoValidation } from '../hooks/useBoletoValidation'
import { useBoletoPreview } from '../hooks/useBoletoPreview'
import { usePaymentSaga } from '../hooks/usePaymentSaga'
import { BoletoInput } from '../components/BoletoInput'
import { PaymentReviewCard } from '../components/PaymentReviewCard'
import { PaymentStatusTracker } from '../components/PaymentStatusTracker'
import styles from './PagamentoPage.module.scss'

export function PagamentoPage() {
  const navigate = useNavigate()
  const { linhaDigitavel, alterarLinhaDigitavel, resultado, limpar } = useBoletoValidation()
  const { preview } = useBoletoPreview(linhaDigitavel, resultado.valido)
  const {
    sagaId,
    estado,
    motivoFalha,
    enviando,
    historico,
    protocolo,
    falhou,
    enviarPagamento,
    reiniciar,
  } = usePaymentSaga()

  // DECISAO: "Tentar Novamente" reinicia a saga (chave nova) e reenvia o
  // MESMO boleto/valor que ja estavam em maos - nao pede pro usuario digitar
  // de novo.
  // PORQUE: e a mesma intencao (pagar esse boleto), so uma tentativa nova -
  // ver CONCEITOS.md sobre por que reusar a idempotency key antiga nao
  // funcionaria (saga terminal, sem transicao de volta).
  const tentarNovamente = () => {
    reiniciar()
    if (preview?.valor !== null && preview?.valor !== undefined) {
      enviarPagamento(linhaDigitavel, preview.valor)
    }
  }

  // DECISAO: "Novo Pagamento" reseta tudo - saga E o campo de entrada.
  // PORQUE: diferente de "Tentar Novamente", aqui a intencao mudou (outro
  // boleto, ou so recomecar do zero) - nao faz sentido manter a linha
  // digitavel antiga preenchida.
  const novoPagamento = () => {
    reiniciar()
    limpar()
  }

  // DECISAO: sagaId existe -> mostra so o tracker; senao -> input + revisao.
  // PORQUE: e a mesma troca de tela que o Figma mostra - depois de enviar,
  // o formulario de entrada sai de cena, so o acompanhamento fica visivel.
  if (sagaId) {
    return (
      <div className={styles.pagina}>
        <button type="button" className={styles.botaoVoltar} onClick={() => navigate(-1)}>
          ← Voltar
        </button>
        <h1 className={styles.titulo}>Pagar Boleto</h1>
        <p className={styles.subtitulo}>Insira o código para consultar e realizar o pagamento</p>
        <PaymentStatusTracker
          estado={estado}
          historico={historico}
          motivoFalha={motivoFalha}
          protocolo={protocolo}
        />
        {falhou && (
          <button type="button" className={styles.botaoTentarNovamente} onClick={tentarNovamente}>
            Tentar Novamente
          </button>
        )}
        {estado === 'CONCLUIDO' && (
          <button type="button" className={styles.botaoNovoPagamento} onClick={novoPagamento}>
            Novo Pagamento
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={styles.pagina}>
      <button type="button" className={styles.botaoVoltar} onClick={() => navigate(-1)}>
        ← Voltar
      </button>
      <h1 className={styles.titulo}>Pagar Boleto</h1>
      <p className={styles.subtitulo}>Insira o código para consultar e realizar o pagamento</p>
      <div className={styles.card}>
        <BoletoInput
          linhaDigitavel={linhaDigitavel}
          aoAlterar={alterarLinhaDigitavel}
          resultado={resultado}
        />
      </div>
      {resultado.valido && preview?.encontrado && (
        <PaymentReviewCard
          preview={preview}
          enviando={enviando}
          aoConfirmar={() => {
            if (preview.valor !== null) {
              enviarPagamento(linhaDigitavel, preview.valor)
            }
          }}
        />
      )}
    </div>
  )
}
