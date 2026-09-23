import type { HistoricoEntry, SagaState } from "../hooks/usePaymentSaga";

export type StatusLinha = "concluido" | "processando" | "pendente" | "falhou";

export type LinhaTimeline = {
    id: string;
    titulo: string;
    descricao: string;
    status: StatusLinha;
    timestamp: string | null;
    motivoFalha: string | null;
};

const ETAPAS_CORE: { estado: SagaState; titulo: string; descricao: string }[] = [
    { estado: "RECEBIDO", titulo: "Recebido", descricao: "Instrução de pagamento recebida pelo sistema" },
    { estado: "VALIDADO", titulo: "Validado", descricao: "Dados do boleto e beneficiário verificados" },
    { estado: "SALDO_RESERVADO", titulo: "Saldo Reservado", descricao: "Valor bloqueado na sua conta corrente" },
    { estado: "LIQUIDACAO_ENVIADA", titulo: "Liquidação Enviada", descricao: "Ordem encaminhada à compensação bancária" },
];

const ESTADOS_TERMINAIS_FALHA: SagaState[] = ["REJEITADO", "FALHOU"];

// DECISAO: loop imperativo (for) em vez de .map com flag externa.
// PORQUE: a regra depende de um "gap ainda nao encontrado" que precisa
// persistir entre iteracoes - um for deixa essa dependencia sequencial
// explicita, em vez de escrever um .map com efeito colateral escondido.
export function montarTimeline(
    estadoAtual: SagaState | null,
    historico: HistoricoEntry[],
    motivoFalha: string | null
): LinhaTimeline[] {
    if (!estadoAtual) {
        return [];
    }

    const terminouEmFalha = ESTADOS_TERMINAIS_FALHA.includes(estadoAtual);
    const terminouComSucesso = estadoAtual === "CONCLUIDO";
    const finalizado = terminouEmFalha || terminouComSucesso;

    const linhasCore: LinhaTimeline[] = [];
    let gapEncontrado = false;

    for (const etapa of ETAPAS_CORE) {
        const entrada = historico.find((h) => h.estado === etapa.estado);

        if (entrada) {
            linhasCore.push({
                id: etapa.estado,
                titulo: etapa.titulo,
                descricao: etapa.descricao,
                status: "concluido",
                timestamp: entrada.timestamp,
                motivoFalha: null,
            });
            continue;
        }

        if (!gapEncontrado) {
            gapEncontrado = true;
            if (terminouEmFalha) {
                linhasCore.push({
                    id: etapa.estado,
                    titulo: etapa.titulo,
                    descricao: etapa.descricao,
                    status: "falhou",
                    timestamp: null,
                    motivoFalha,
                });
                continue;
            }
            if (!finalizado) {
                linhasCore.push({
                    id: etapa.estado,
                    titulo: etapa.titulo,
                    descricao: etapa.descricao,
                    status: "processando",
                    timestamp: null,
                    motivoFalha: null,
                });
                continue;
            }
        }

        linhasCore.push({
            id: etapa.estado,
            titulo: etapa.titulo,
            descricao: etapa.descricao,
            status: "pendente",
            timestamp: null,
            motivoFalha: null,
        });
    }

    const linhaFinal: LinhaTimeline = terminouComSucesso
        ? {
            id: "RESULTADO",
            titulo: "Concluído com sucesso",
            descricao: "Pagamento liquidado e comprovante disponível",
            status: "concluido",
            timestamp: historico.find((h) => h.estado === "CONCLUIDO")?.timestamp ?? null,
            motivoFalha: null,
        }
        : terminouEmFalha
            ? {
                id: "RESULTADO",
                titulo: "Pagamento não realizado",
                descricao: "Nenhum valor foi debitado da sua conta",
                status: "falhou",
                // DECISAO: busca o timestamp de estadoAtual (REJEITADO ou
                // FALHOU) no historico, igual o ramo de sucesso ja fazia pra
                // CONCLUIDO.
                // PORQUE: bug real - estava hardcoded como null, entao a
                // linha final de falha nunca mostrava horario nenhum, mesmo
                // FALHOU/REJEITADO sendo um estado com sua propria linha no
                // historico (SagaTransicao), com timestamp de verdade.
                timestamp: historico.find((h) => h.estado === estadoAtual)?.timestamp ?? null,
                motivoFalha: null,
            }
            : {
                id: "RESULTADO",
                titulo: "Aguardando confirmação...",
                descricao: "",
                status: "pendente",
                timestamp: null,
                motivoFalha: null,
            };

    return [...linhasCore, linhaFinal]
}