package com.itau.boletosaga.saga.messaging;

import java.util.UUID;

public record CompensarReservaCommand(UUID sagaId) {
}
