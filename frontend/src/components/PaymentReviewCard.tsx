import type { BoletoPreview } from "../hooks/useBoletoPreview";
import styles from "./PaymentReviewCard.module.scss";

type PaymentReviewCardProps = {
  preview: BoletoPreview;
  aoConfirmar: () => void;
  enviando: boolean;
  rotuloBotao?: string;
  mensagemBloqueio?: string;
  desabilitado?: boolean;
};

export function PaymentReviewCard({
  preview,
  aoConfirmar,
  enviando,
  rotuloBotao = "Confirmar Pagamento",
  mensagemBloqueio,
  desabilitado = false,
}: PaymentReviewCardProps) {
  return (
    <div className={styles.card}>
      <h2 className={styles.titulo}>Revisão do Pagamento</h2>
      <dl className={styles.lista}>
        <dt className={styles.rotulo}>Beneficiário</dt>
        <dd className={styles.valorCampo}>{preview.beneficiario}</dd>
        <dt className={styles.rotulo}>Valor</dt>
        <dd className={styles.valorCampo}>{formatarValor(preview.valor)}</dd>
        <dt className={styles.rotulo}>Vencimento</dt>
        <dd className={styles.valorCampo}>{preview.vencimento && formatarData(preview.vencimento)}</dd>
        <dt className={styles.rotulo}>Tipo</dt>
        <dd className={styles.valorCampo}>{preview.tipo}</dd>
        {preview.banco !== null && (
          <>
            <dt className={styles.rotulo}>Banco</dt>
            <dd className={styles.valorCampo}>{preview.banco}</dd>
          </>
        )}
      </dl>
      <p className={styles.total}>
        <span>Total a debitar</span>
        <span>{formatarValor(preview.valor)}</span>
      </p>
      {mensagemBloqueio && (
        <p role="alert" className={styles.avisoBloqueio}>
          {mensagemBloqueio}
        </p>
      )}
      <button type="button" className={styles.botao} onClick={aoConfirmar} disabled={enviando || desabilitado}>
        {rotuloBotao}
      </button>
    </div>
  );
}

function formatarValor(valor: number | null): string {
  if (valor === null) {
    return "-";
  }
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
}
