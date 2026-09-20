package com.itau.boletosaga.saga;

import org.junit.jupiter.api.Test;

import static com.itau.boletosaga.saga.SagaState.*;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SagaStateMachineTest {

    @Test
    void fluxoFelizEhValidoPassoAPasso() {
        assertTrue(RECEBIDO.podeTransicionarPara(VALIDADO));
        assertTrue(VALIDADO.podeTransicionarPara(SALDO_RESERVADO));
        assertTrue(SALDO_RESERVADO.podeTransicionarPara(LIQUIDACAO_ENVIADA));
        assertTrue(LIQUIDACAO_ENVIADA.podeTransicionarPara(CONCLUIDO));
    }

    @Test
    void compensacaoAPartirDeSaldoReservadoLevaParaRejeitado() {
        assertTrue(SALDO_RESERVADO.podeTransicionarPara(SALDO_LIBERADO));
        assertTrue(SALDO_LIBERADO.podeTransicionarPara(REJEITADO));
    }

    @Test
    void compensacaoAPartirDeLiquidacaoEnviadaLevaParaFalhou() {
        assertTrue(LIQUIDACAO_ENVIADA.podeTransicionarPara(SALDO_LIBERADO));
        assertTrue(SALDO_LIBERADO.podeTransicionarPara(FALHOU));
    }

    @Test
    void naoPodePularEtapa() {
        assertFalse(RECEBIDO.podeTransicionarPara(SALDO_RESERVADO));
        assertFalse(RECEBIDO.podeTransicionarPara(CONCLUIDO));
        assertFalse(VALIDADO.podeTransicionarPara(CONCLUIDO));
    }

    @Test
    void estadosTerminaisNaoTransicionamParaLugarNenhum() {
        for (SagaState terminal : new SagaState[] { CONCLUIDO, REJEITADO, FALHOU }) {
            for (SagaState possivelAlvo : SagaState.values()) {
                assertFalse(terminal.podeTransicionarPara(possivelAlvo),
                        terminal + " nao deveria poder ir para " + possivelAlvo);
            }
        }
    }
}
