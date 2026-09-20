package com.itau.boletosaga.saga.messaging;

import java.util.UUID;

public record LiquidacaoProcessadaEvent(UUID sagaId, boolean sucesso, String motivoFalha) {

    public static LiquidacaoProcessadaEvent sucesso(UUID sagaId) {
        return new LiquidacaoProcessadaEvent(sagaId, true, null);
    }

    public static LiquidacaoProcessadaEvent falha(UUID sagaId, String motivo) {
        return new LiquidacaoProcessadaEvent(sagaId, false, motivo);
    }
}
