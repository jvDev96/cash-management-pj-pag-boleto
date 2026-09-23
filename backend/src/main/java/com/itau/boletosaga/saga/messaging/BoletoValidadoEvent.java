package com.itau.boletosaga.saga.messaging;

import java.time.LocalDate;
import java.util.UUID;

public record BoletoValidadoEvent(
        UUID sagaId,
        boolean sucesso,
        String beneficiario,
        LocalDate vencimento,
        String motivoFalha
) {

    public static BoletoValidadoEvent sucesso(UUID sagaId, String beneficiario, LocalDate vencimento) {
        return new BoletoValidadoEvent(sagaId, true, beneficiario, vencimento, null);
    }

    public static BoletoValidadoEvent falha(UUID sagaId, String motivo) {
        return new BoletoValidadoEvent(sagaId, false, null, null, motivo);
    }
}
