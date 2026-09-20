package com.itau.boletosaga.saga;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "saga")
public class Saga {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SagaState estado;

    @Column(nullable = false)
    private String linhaDigitavel;

    @Column(nullable = false)
    private BigDecimal valor;

    private String beneficiario;

    private LocalDate vencimento;

    private String motivoFalha;

    @Column(nullable = false)
    private Instant criadoEm;

    @Column(nullable = false)
    private Instant atualizadoEm;

    // DECISAO: construtor vazio protected, nao public
    // PORQUE: o Hibernate exige um construtor sem argumentos pra conseguir
    // instanciar a entidade via reflection ao ler do banco - mas ninguem no
    // nosso codigo deveria criar uma Saga "vazia" na mao, por isso protected
    // em vez de public.
    protected Saga() {
    }

    public Saga(String idempotencyKey, String linhaDigitavel, BigDecimal valor) {
        this.id = UUID.randomUUID();
        this.idempotencyKey = idempotencyKey;
        this.linhaDigitavel = linhaDigitavel;
        this.valor = valor;
        this.estado = SagaState.RECEBIDO;
        this.criadoEm = Instant.now();
        this.atualizadoEm = Instant.now();
    }

    // DECISAO: transicionarPara em vez de um setEstado(...) publico
    // PORQUE: um setter generico deixaria qualquer chamador colocar a saga
    // em QUALQUER estado, ignorando a maquina de estados que a gente acabou
    // de testar. Esse metodo reusa SagaState.podeTransicionarPara para se
    // proteger - a entidade nunca fica num estado que a maquina nao permite.
    public void transicionarPara(SagaState novoEstado) {
        if (!estado.podeTransicionarPara(novoEstado)) {
            throw new IllegalStateException(
                "Transicao invalida: " + estado + " -> " + novoEstado);
        }
        this.estado = novoEstado;
        this.atualizadoEm = Instant.now();
    }

    public void registrarFalha(String motivo) {
        this.motivoFalha = motivo;
    }

    public void preencherDadosConsultados(String beneficiario, LocalDate vencimento) {
        this.beneficiario = beneficiario;
        this.vencimento = vencimento;
    }

    public UUID getId() {
        return id;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public SagaState getEstado() {
        return estado;
    }

    public String getLinhaDigitavel() {
        return linhaDigitavel;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public String getBeneficiario() {
        return beneficiario;
    }

    public LocalDate getVencimento() {
        return vencimento;
    }

    public String getMotivoFalha() {
        return motivoFalha;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }
}
