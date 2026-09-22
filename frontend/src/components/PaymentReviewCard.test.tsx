import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentReviewCard } from "./PaymentReviewCard";
import type { BoletoPreview } from "../hooks/useBoletoPreview";

const previewMock: BoletoPreview = {
  encontrado: true,
  beneficiario: "Lojas Renner S.A.",
  valor: 150.5,
  vencimento: "2026-10-15",
  tipo: "Boleto bancario",
  banco: "Itau Unibanco S.A.",
  motivoFalha: null,
};

describe("PaymentReviewCard", () => {
  it("mostra os dados do preview formatados", () => {
    render(<PaymentReviewCard preview={previewMock} aoConfirmar={vi.fn()} enviando={false} />);

    const valores = screen.getAllByText(/R\$\s*150,50/);

    expect(screen.getByText("Lojas Renner S.A.")).toBeTruthy();
    expect(screen.getByText("15/10/2026")).toBeTruthy();

    expect(valores).toHaveLength(2); // aparece na linha "Valor" e em "Total a debitar"
  });

  it("chama aoConfirmar ao clicar no botao", () => {
    const aoConfirmar = vi.fn();
    render(<PaymentReviewCard preview={previewMock} aoConfirmar={aoConfirmar} enviando={false} />);

    fireEvent.click(screen.getByText("Confirmar Pagamento"));

    expect(aoConfirmar).toHaveBeenCalledTimes(1);
  });

  it("desabilita o botao enquanto esta enviando", () => {
    render(<PaymentReviewCard preview={previewMock} aoConfirmar={vi.fn()} enviando={true} />);

    const botao = screen.getByText("Confirmar Pagamento") as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });
});
