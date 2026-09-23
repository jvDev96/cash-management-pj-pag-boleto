package com.itau.boletosaga.saga.messaging;

import java.math.BigDecimal;
import java.util.UUID;

// DECISAO: carrega valor, nao so sagaId.
// PORQUE: compensar precisa devolver a quantia exata que tinha sido
// reservada pro saldo disponivel do cliente - o ContaSaldoListener nao tem
// (nem deveria abrir) acesso a Saga pra descobrir esse valor por conta
// propria, ele so fala com filas.
public record CompensarReservaCommand(UUID sagaId, BigDecimal valor) {
}
