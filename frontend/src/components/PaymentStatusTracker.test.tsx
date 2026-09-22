import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentStatusTracker } from "./PaymentStatusTracker";
import type { HistoricoEntry } from "../hooks/usePaymentSaga";

describe("PaymentStatusTracker", () => {
  it("sem estado, nao renderiza nada", () => {
    const { container } = render(
      <PaymentStatusTracker estado={null} historico={[]} motivoFalha={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("em andamento: mostra 'Processando...' na etapa atual", () => {
    const historico: HistoricoEntry[] = [{ estado: "RECEBIDO", timestamp: "2026-09-22T10:00:00Z" }];

    render(<PaymentStatusTracker estado="RECEBIDO" historico={historico} motivoFalha={null} />);

    expect(screen.getByText("Recebido")).toBeTruthy();
    expect(screen.getByText("Validado")).toBeTruthy();
    expect(screen.getByText("Processando...")).toBeTruthy();
    expect(screen.getByText("Aguardando confirmação...")).toBeTruthy();
  });

  it("falha: mostra o motivo dentro de um role=alert", () => {
    const historico: HistoricoEntry[] = [
      { estado: "RECEBIDO", timestamp: "T1" },
      { estado: "VALIDADO", timestamp: "T2" },
    ];

    render(
      <PaymentStatusTracker estado="REJEITADO" historico={historico} motivoFalha="Saldo insuficiente" />
    );

    expect(screen.getByRole("alert").textContent).toContain("Saldo insuficiente");
    expect(screen.getByText("Pagamento não realizado")).toBeTruthy();
  });

  it("sucesso: mostra a mensagem final de sucesso", () => {
    const historico: HistoricoEntry[] = [
      { estado: "RECEBIDO", timestamp: "T1" },
      { estado: "VALIDADO", timestamp: "T2" },
      { estado: "SALDO_RESERVADO", timestamp: "T3" },
      { estado: "LIQUIDACAO_ENVIADA", timestamp: "T4" },
      { estado: "CONCLUIDO", timestamp: "T5" },
    ];

    render(<PaymentStatusTracker estado="CONCLUIDO" historico={historico} motivoFalha={null} />);

    expect(screen.getByText("Concluído com sucesso")).toBeTruthy();
  });
});
