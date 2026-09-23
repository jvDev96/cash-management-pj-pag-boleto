package com.itau.boletosaga.saga.messaging;

import java.math.BigDecimal;
import java.util.UUID;

public record CompensarReservaCommand(UUID sagaId, BigDecimal valor) {
}
