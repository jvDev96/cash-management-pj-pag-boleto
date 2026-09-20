package com.itau.boletosaga.saga.messaging;

import java.util.UUID;

public record SaldoReservadoEvent(UUID sagaId, boolean sucesso, String motivoFalha) {

    public static SaldoReservadoEvent sucesso(UUID sagaId) {
        return new SaldoReservadoEvent(sagaId, true, null);
    }

    public static SaldoReservadoEvent falha(UUID sagaId, String motivo) {
        return new SaldoReservadoEvent(sagaId, false, motivo);
    }
}
