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

// DECISAO: import dinamico (code-splitting), nao import estatico no topo.
// PORQUE: @zxing/library sozinha adiciona ~500KB ao bundle principal - custo
// pago por TODO usuario, mesmo quem nunca clica em "Escanear". Com
// React.lazy, esse pedaço só é baixado no momento em que o botão é clicado,
// mantendo o bundle inicial pequeno pro caminho comum (digitar/colar).
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
      {/* DECISAO: mensagem de "nao encontrado" explicita, nao so o card sumindo em silencio. */}
      {/* PORQUE: bug real reportado - linha valida ESTRUTURALMENTE (ex: convenio, que */}
      {/* sempre passa na validacao client-side) mas terminando em "0000" (regra */}
      {/* deterministica de "boleto nao encontrado" simulada no backend) fazia o card de */}
      {/* revisao sumir sem nenhuma explicacao - preview.motivoFalha ja existia no hook, */}
      {/* so nunca era renderizado em lugar nenhum. */}
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
          mensagemBloqueio={preview.sagaExistente ? mensagemBloqueio(preview.estadoSagaExistente) : undefined}
          aoConfirmar={() => {
            // DECISAO: se ja existe uma saga bloqueante pra esse numero de
            // boleto (ver SagaState.ESTADOS_QUE_NAO_BLOQUEIAM_NOVO_PAGAMENTO
            // no backend), o botao NAVEGA pro acompanhamento dela em vez de
            // criar um pagamento novo.
            // PORQUE: idempotency-key so protege contra reenvio acidental da
            // MESMA tentativa - nao impede o usuario digitar de proposito,
            // numa tentativa nova, um documento que ja foi pago ou que ainda
            // pode vir a ser pago. Reaproveita a mesma secao/visao que o
            // historico ja usa (?view=historico&saga=... + PaymentStatusTracker),
            // nao uma tela nova so pra isso.
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

function mensagemBloqueio(estado: SagaState | null): string {
  if (estado === 'CONCLUIDO') {
    return 'Este boleto já foi pago.'
  }
  return 'Este boleto já tem um pagamento em andamento.'
}
