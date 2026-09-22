import { useBoletoValidation } from '../hooks/useBoletoValidation'
import { useBoletoPreview } from '../hooks/useBoletoPreview'
import { usePaymentSaga } from '../hooks/usePaymentSaga'
import { BoletoInput } from '../components/BoletoInput'
import { PaymentReviewCard } from '../components/PaymentReviewCard'
import { PaymentStatusTracker } from '../components/PaymentStatusTracker'

export function PagamentoPage() {
  const { linhaDigitavel, alterarLinhaDigitavel, resultado } = useBoletoValidation()
  const { preview } = useBoletoPreview(linhaDigitavel, resultado.valido)
  const { sagaId, estado, motivoFalha, enviando, historico, protocolo, enviarPagamento } = usePaymentSaga()

  // DECISAO: sagaId existe -> mostra so o tracker; senao -> input + revisao.
  // PORQUE: e a mesma troca de tela que o Figma mostra - depois de enviar,
  // o formulario de entrada sai de cena, so o acompanhamento fica visivel.
  if (sagaId) {
    return (
      <PaymentStatusTracker
        estado={estado}
        historico={historico}
        motivoFalha={motivoFalha}
        protocolo={protocolo}
      />
    )
  }

  return (
    <div>
      <BoletoInput
        linhaDigitavel={linhaDigitavel}
        aoAlterar={alterarLinhaDigitavel}
        resultado={resultado}
      />
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
