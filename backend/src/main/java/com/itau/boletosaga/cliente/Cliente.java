package com.itau.boletosaga.cliente;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "cliente")
public class Cliente {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private BigDecimal saldoReal;

    @Column(nullable = false)
    private BigDecimal saldoDisponivel;

    @Version
    private Long version;

    protected Cliente() {
    }

    public Cliente(UUID id, String nome, BigDecimal saldoInicial) {
        this.id = id;
        this.nome = nome;
        this.saldoReal = saldoInicial;
        this.saldoDisponivel = saldoInicial;
    }

    public void reservar(BigDecimal valor) {
        if (saldoDisponivel.compareTo(valor) < 0) {
            throw new SaldoInsuficienteException(saldoDisponivel, valor);
        }
        this.saldoDisponivel = this.saldoDisponivel.subtract(valor);
    }

    public void liberarReserva(BigDecimal valor) {
        this.saldoDisponivel = this.saldoDisponivel.add(valor);
    }

    public void confirmarDebito(BigDecimal valor) {
        this.saldoReal = this.saldoReal.subtract(valor);
    }

    public void resetarSaldo(BigDecimal saldoInicial) {
        this.saldoReal = saldoInicial;
        this.saldoDisponivel = saldoInicial;
    }

    public void depositar(BigDecimal valor) {
        if (valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Valor do deposito precisa ser maior que zero");
        }
        this.saldoReal = this.saldoReal.add(valor);
        this.saldoDisponivel = this.saldoDisponivel.add(valor);
    }

    public UUID getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public BigDecimal getSaldoReal() {
        return saldoReal;
    }

    public BigDecimal getSaldoDisponivel() {
        return saldoDisponivel;
    }
}
