package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.itau.boletosaga.saga.Saga;
import com.itau.boletosaga.saga.SagaState;

public record PagamentoResumoResponse(UUID sagaId, String beneficiario, BigDecimal valor, SagaState estado,
                                       Instant atualizadoEm) {
    public static PagamentoResumoResponse de(Saga saga) {
        return new PagamentoResumoResponse(saga.getId(), saga.getBeneficiario(), saga.getValor(), saga.getEstado(),
                saga.getAtualizadoEm());
    }
}
