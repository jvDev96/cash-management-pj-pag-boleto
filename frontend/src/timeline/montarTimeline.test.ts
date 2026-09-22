import { describe, expect, it } from "vitest";
import { montarTimeline } from "./montarTimeline";
import type { HistoricoEntry } from "../hooks/usePaymentSaga";

describe("montarTimeline", () => {
  it("sem estado atual, devolve array vazio", () => {
    expect(montarTimeline(null, [], null)).toEqual([]);
  });

  it("em andamento cedo: RECEBIDO concluido, VALIDADO processando, resto pendente", () => {
    const historico: HistoricoEntry[] = [{ estado: "RECEBIDO", timestamp: "T1" }];

    const linhas = montarTimeline("RECEBIDO", historico, null);

    expect(linhas.map((l) => l.status)).toEqual([
      "concluido",   // RECEBIDO
      "processando", // VALIDADO
      "pendente",    // SALDO_RESERVADO
      "pendente",    // LIQUIDACAO_ENVIADA
      "pendente",    // RESULTADO
    ]);
    expect(linhas[4].titulo).toBe("Aguardando confirmação...");
  });

  it("sucesso: todas as 4 core concluidas + resultado concluido", () => {
    const historico: HistoricoEntry[] = [
      { estado: "RECEBIDO", timestamp: "T1" },
      { estado: "VALIDADO", timestamp: "T2" },
      { estado: "SALDO_RESERVADO", timestamp: "T3" },
      { estado: "LIQUIDACAO_ENVIADA", timestamp: "T4" },
      { estado: "CONCLUIDO", timestamp: "T5" },
    ];

    const linhas = montarTimeline("CONCLUIDO", historico, null);

    expect(linhas.map((l) => l.status)).toEqual([
      "concluido", "concluido", "concluido", "concluido", "concluido",
    ]);
    expect(linhas[4].titulo).toBe("Concluído com sucesso");
    expect(linhas[4].timestamp).toBe("T5");
  });

  it("falha cedo: para antes de SALDO_RESERVADO, so essa linha fica vermelha", () => {
    const historico: HistoricoEntry[] = [
      { estado: "RECEBIDO", timestamp: "T1" },
      { estado: "VALIDADO", timestamp: "T2" },
      { estado: "REJEITADO", timestamp: "T3" },
    ];

    const linhas = montarTimeline("REJEITADO", historico, "Saldo insuficiente");

    expect(linhas.map((l) => l.status)).toEqual([
      "concluido", // RECEBIDO
      "concluido", // VALIDADO
      "falhou",    // SALDO_RESERVADO - era a etapa em tentativa
      "pendente",  // LIQUIDACAO_ENVIADA - nunca chegou a ser tentada
      "falhou",    // RESULTADO
    ]);
    expect(linhas[2].motivoFalha).toBe("Saldo insuficiente");
    expect(linhas[3].motivoFalha).toBeNull();
    expect(linhas[4].titulo).toBe("Pagamento não realizado");
  });

  it("falha tardia: todas as 4 core sucederam, falha so aparece no resultado", () => {
    const historico: HistoricoEntry[] = [
      { estado: "RECEBIDO", timestamp: "T1" },
      { estado: "VALIDADO", timestamp: "T2" },
      { estado: "SALDO_RESERVADO", timestamp: "T3" },
      { estado: "LIQUIDACAO_ENVIADA", timestamp: "T4" },
      { estado: "SALDO_LIBERADO", timestamp: "T5" },
      { estado: "FALHOU", timestamp: "T6" },
    ];

    const linhas = montarTimeline("FALHOU", historico, null);

    expect(linhas.map((l) => l.status)).toEqual([
      "concluido", "concluido", "concluido", "concluido", "falhou",
    ]);
    expect(linhas[4].titulo).toBe("Pagamento não realizado");
  });
});
