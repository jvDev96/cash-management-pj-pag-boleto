package com.itau.boletosaga.cliente;

import java.math.BigDecimal;

public class SaldoInsuficienteException extends RuntimeException {

    public SaldoInsuficienteException(BigDecimal saldoDisponivel, BigDecimal valorSolicitado) {
        super("Saldo insuficiente: disponivel=" + saldoDisponivel + ", solicitado=" + valorSolicitado);
    }
}
