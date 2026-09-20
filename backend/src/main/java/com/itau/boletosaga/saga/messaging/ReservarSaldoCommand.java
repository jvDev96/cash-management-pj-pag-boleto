package com.itau.boletosaga.saga.messaging;

import java.math.BigDecimal;
import java.util.UUID;

public record ReservarSaldoCommand(UUID sagaId, BigDecimal valor) {
}
