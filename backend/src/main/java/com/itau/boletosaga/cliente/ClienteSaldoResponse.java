package com.itau.boletosaga.cliente;

import java.math.BigDecimal;

public record ClienteSaldoResponse(String nome, BigDecimal saldoReal, BigDecimal saldoDisponivel) {

    public static ClienteSaldoResponse de(Cliente cliente) {
        return new ClienteSaldoResponse(cliente.getNome(), cliente.getSaldoReal(), cliente.getSaldoDisponivel());
    }
}
