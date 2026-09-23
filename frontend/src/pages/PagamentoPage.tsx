import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoletoValidation } from '../hooks/useBoletoValidation'
import { useBoletoPreview } from '../hooks/useBoletoPreview'
import { usePaymentSaga } from '../hooks/usePaymentSaga'
import type { SagaState } from '../hooks/usePaymentSaga'
import { BoletoInput } from '../components/BoletoInput'
import { PaymentReviewCard } from '../components/PaymentReviewCard'
import { PaymentStatusTracker } from '../components/PaymentStatusTracker'
import styles from './PagamentoPage.module.scss'

const LeitorCodigoBarras = lazy(() =>
  import('../components/LeitorCodigoBarras').then((m) => ({ default: m.LeitorCodigoBarras }))
)

export function PagamentoPage() {
  const navigate = useNavigate()
  const { linhaDigitavel, alterarLinhaDigitavel, resultado, limpar } = useBoletoValidation()
  const [leitorAberto, setLeitorAberto] = useState(false)
  const { preview, carregando: carregandoPreview } = useBoletoPreview(linhaDigitavel, resultado.valido)
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

  const tentarNovamente = () => {
    reiniciar()
    if (preview?.valor !== null && preview?.valor !== undefined) {
      enviarPagamento(linhaDigitavel, preview.valor)
    }
  }

  const novoPagamento = () => {
    reiniciar()
    limpar()
  }

  if (sagaId) {
    return (
      <div className={styles.pagina}>
        <h1 className={styles.titulo}>Pagar Boleto</h1>
        <p className={styles.subtitulo}>Insira o código para consultar e realizar o pagamento</p>
        <PaymentStatusTracker
          estado={estado}
          historico={historico}
          motivoFalha={motivoFalha}
          protocolo={protocolo}
          boleto={{
            beneficiario: preview?.beneficiario ?? null,
            valor: preview?.valor ?? null,
            vencimento: preview?.vencimento ?? null,
            linhaDigitavel,
          }}
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
      <h1 className={styles.titulo}>Pagar Boleto</h1>
      <p className={styles.subtitulo}>Insira o código para consultar e realizar o pagamento</p>
      <div className={styles.card}>
        <BoletoInput
          linhaDigitavel={linhaDigitavel}
          aoAlterar={alterarLinhaDigitavel}
          resultado={resultado}
        />
        <button type="button" className={styles.botaoEscanear} onClick={() => setLeitorAberto(true)}>
          📷 Escanear código de barras
        </button>
      </div>
      {leitorAberto && (
        <Suspense fallback={null}>
          <LeitorCodigoBarras
            aoLer={(codigo) => {
              alterarLinhaDigitavel(codigo)
              setLeitorAberto(false)
            }}
            aoFechar={() => setLeitorAberto(false)}
          />
        </Suspense>
      )}
      {resultado.valido && !carregandoPreview && preview && !preview.encontrado && (
        <p role="alert" className={styles.avisoNaoEncontrado}>
          {preview.motivoFalha ?? 'Não foi possível encontrar esse boleto.'}
        </p>
      )}
      {resultado.valido && preview?.encontrado && (
        <PaymentReviewCard
          preview={preview}
          enviando={enviando}
          rotuloBotao={preview.sagaExistente ? 'Acompanhar Pagamento' : 'Confirmar Pagamento'}
          mensagemBloqueio={mensagemBloqueio(preview)}
          desabilitado={!preview.sagaExistente && preview.valor === null}
          aoConfirmar={() => {
            if (preview.sagaExistente) {
              navigate(`/?view=historico&saga=${preview.sagaExistente}`)
            } else if (preview.valor !== null) {
              enviarPagamento(linhaDigitavel, preview.valor)
            }
          }}
        />
      )}
    </div>
  )
}

function mensagemBloqueio(preview: { sagaExistente: string | null; estadoSagaExistente: SagaState | null; valor: number | null }): string | undefined {
  if (preview.sagaExistente) {
    return preview.estadoSagaExistente === 'CONCLUIDO'
      ? 'Este boleto já foi pago.'
      : 'Este boleto já tem um pagamento em andamento.'
  }
  if (preview.valor === null) {
    return 'Este documento não representa um valor monetário direto (é quantidade ou valor de referência) — não é possível confirmar o pagamento.'
  }
  return undefined
}
