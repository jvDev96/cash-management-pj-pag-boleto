package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import com.itau.boletosaga.saga.SagaState;

public record BoletoPreviewResponse(
        boolean encontrado,
        String beneficiario,
        BigDecimal valor,
        LocalDate vencimento,
        String tipo,
        String banco,
        String motivoFalha,
        UUID sagaExistente,
        SagaState estadoSagaExistente
) {
    public static BoletoPreviewResponse encontrado(String beneficiario, BigDecimal valor, LocalDate vencimento,
                                                     String tipo, String banco,
                                                     UUID sagaExistente, SagaState estadoSagaExistente) {
        return new BoletoPreviewResponse(true, beneficiario, valor, vencimento, tipo, banco, null,
                sagaExistente, estadoSagaExistente);
    }

    public static BoletoPreviewResponse naoEncontrado(String motivo) {
        return new BoletoPreviewResponse(false, null, null, null, null, null, motivo, null, null);
    }
}
