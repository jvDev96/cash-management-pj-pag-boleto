import type { BoletoPreview } from "../hooks/useBoletoPreview";

type PaymentReviewCardProps = {
  preview: BoletoPreview;
  aoConfirmar: () => void;
  enviando: boolean;
};

export function PaymentReviewCard({ preview, aoConfirmar, enviando }: PaymentReviewCardProps) {
  return (
    <div>
      <h2>Revisão do Pagamento</h2>
      <dl>
        <dt>Beneficiário</dt>
        <dd>{preview.beneficiario}</dd>
        <dt>Valor</dt>
        <dd>{formatarValor(preview.valor)}</dd>
        <dt>Vencimento</dt>
        <dd>{preview.vencimento && formatarData(preview.vencimento)}</dd>
        <dt>Tipo</dt>
        <dd>{preview.tipo}</dd>
        <dt>Banco</dt>
        <dd>{preview.banco}</dd>
      </dl>
      <p>Total a debitar: {formatarValor(preview.valor)}</p>
      <button type="button" onClick={aoConfirmar} disabled={enviando}>
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