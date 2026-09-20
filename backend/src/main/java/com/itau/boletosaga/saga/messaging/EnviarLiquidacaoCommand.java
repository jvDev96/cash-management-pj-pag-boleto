package com.itau.boletosaga.saga.messaging;

import java.math.BigDecimal;
import java.util.UUID;

public record EnviarLiquidacaoCommand(UUID sagaId, BigDecimal valor) {
}
