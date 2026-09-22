package com.itau.boletosaga.saga;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.time.Instant;
import java.util.UUID;

// DECISAO: log append-only, sem estadoAnterior armazenado.
// PORQUE: cada linha e so "essa saga esteve nesse estado, nesse instante" -
// o estado anterior e derivavel olhando a linha cronologicamente anterior
// pra mesma sagaId, nao precisa duplicar o dado. Existe so pra alimentar a
// timeline do front (timestamp por etapa + qual etapa estava em andamento
// quando a saga falhou) - nao e a entidade Saga principal, que continua
// guardando so o estado ATUAL.
@Entity
public class SagaTransicao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private UUID sagaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SagaState estado;

    @Column(nullable = false)
    private Instant timestamp;

    protected SagaTransicao() {
        // exigido pelo JPA
    }

    public SagaTransicao(UUID sagaId, SagaState estado, Instant timestamp) {
        this.sagaId = sagaId;
        this.estado = estado;
        this.timestamp = timestamp;
    }

    public Long getId() {
        return id;
    }

    public UUID getSagaId() {
        return sagaId;
    }

    public SagaState getEstado() {
        return estado;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
