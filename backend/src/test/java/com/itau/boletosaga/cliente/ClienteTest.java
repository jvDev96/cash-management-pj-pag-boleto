package com.itau.boletosaga.cliente;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ClienteTest {

    private Cliente novoCliente(String saldoInicial) {
        return new Cliente(UUID.randomUUID(), "Cliente Teste", new BigDecimal(saldoInicial));
    }

    @Test
    void reservarComSaldoSuficienteDescontaSoDoDisponivel() {
        Cliente cliente = novoCliente("1000.00");
        cliente.reservar(new BigDecimal("300.00"));
        assertEquals(new BigDecimal("700.00"), cliente.getSaldoDisponivel());
        assertEquals(new BigDecimal("1000.00"), cliente.getSaldoReal());
    }

    @Test
    void reservarComSaldoInsuficienteLancaExcecaoSemAlterarSaldo() {
        Cliente cliente = novoCliente("699.99");
        assertThrows(SaldoInsuficienteException.class, () -> cliente.reservar(new BigDecimal("700.00")));
        assertEquals(new BigDecimal("699.99"), cliente.getSaldoDisponivel());
    }

    @Test
    void liberarReservaDevolveSoAoDisponivel() {
        Cliente cliente = novoCliente("1000.00");
        cliente.reservar(new BigDecimal("300.00"));
        cliente.liberarReserva(new BigDecimal("300.00"));
        assertEquals(new BigDecimal("1000.00"), cliente.getSaldoDisponivel());
        assertEquals(new BigDecimal("1000.00"), cliente.getSaldoReal());
    }

    @Test
    void confirmarDebitoDescontaSoDoReal() {
        Cliente cliente = novoCliente("1000.00");
        cliente.reservar(new BigDecimal("300.00"));
        cliente.confirmarDebito(new BigDecimal("300.00"));
        assertEquals(new BigDecimal("700.00"), cliente.getSaldoDisponivel());
        assertEquals(new BigDecimal("700.00"), cliente.getSaldoReal());
    }

    @Test
    void reservarELiberarDuasVezesSeguidasVoltaAoSaldoOriginal() {
        Cliente cliente = novoCliente("500.00");
        cliente.reservar(new BigDecimal("500.00"));
        assertThrows(SaldoInsuficienteException.class, () -> cliente.reservar(new BigDecimal("0.01")));
        cliente.liberarReserva(new BigDecimal("500.00"));
        assertEquals(new BigDecimal("500.00"), cliente.getSaldoDisponivel());
    }
}
