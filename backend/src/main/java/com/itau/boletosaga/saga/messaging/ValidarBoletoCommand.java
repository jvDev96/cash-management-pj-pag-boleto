package com.itau.boletosaga.saga.messaging;

import java.util.UUID;

public record ValidarBoletoCommand(UUID sagaId, String linhaDigitavel) {
}
