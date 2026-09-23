package com.itau.boletosaga.saga;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

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

    private String protocolo;

    @Column(nullable = false)
    private Instant criadoEm;

    @Column(nullable = false)
    private Instant atualizadoEm;

    @Version
    private Long version;

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

    public void definirProtocolo(String protocolo) {
        this.protocolo = protocolo;
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

    public String getProtocolo() {
        return protocolo;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }

    public Long getVersion() {
        return version;
    }
}
