package com.itau.boletosaga.saga;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SagaTest {

    @Test
    void novaSagaComecaComoRecebido() {
        Saga saga = new Saga("chave-123", "34191.79001 01043.510047 91020.150008 1 98760000015000", new BigDecimal("150.00"));
        assertEquals(SagaState.RECEBIDO, saga.getEstado());
    }

    @Test
    void transicaoValidaMudaEstado() {
        Saga saga = new Saga("chave-123", "34191.79001 01043.510047 91020.150008 1 98760000015000", new BigDecimal("150.00"));
        saga.transicionarPara(SagaState.VALIDADO);
        assertEquals(SagaState.VALIDADO, saga.getEstado());
    }

    @Test
    void transicaoInvalidaLancaExcecao() {
        Saga saga = new Saga("chave-123", "34191.79001 01043.510047 91020.150008 1 98760000015000", new BigDecimal("150.00"));
        assertThrows(IllegalStateException.class, () -> saga.transicionarPara(SagaState.CONCLUIDO));
    }
}
