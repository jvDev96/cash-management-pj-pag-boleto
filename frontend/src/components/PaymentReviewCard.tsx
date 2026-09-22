import type { BoletoPreview } from "../hooks/useBoletoPreview";
import styles from "./PaymentReviewCard.module.scss";

type PaymentReviewCardProps = {
  preview: BoletoPreview;
  aoConfirmar: () => void;
  enviando: boolean;
};

export function PaymentReviewCard({ preview, aoConfirmar, enviando }: PaymentReviewCardProps) {
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
        <dt className={styles.rotulo}>Banco</dt>
        <dd className={styles.valorCampo}>{preview.banco}</dd>
      </dl>
      <p className={styles.total}>
        <span>Total a debitar</span>
        <span>{formatarValor(preview.valor)}</span>
      </p>
      <button type="button" className={styles.botao} onClick={aoConfirmar} disabled={enviando}>
        Confirmar Pagamento
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

// DECISAO: constroi a Date a partir de ano/mes/dia separados, nao de
// new Date(dataIsoCompleta).
// PORQUE: new Date("2026-10-15") e interpretado como meia-noite UTC - ao
// formatar de volta no fuso local (Brasil, UTC-3), a data pode "voltar" um
// dia. Construir com (ano, mes-1, dia) usa meia-noite LOCAL, evitando o bug.
function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
}
