package com.itau.boletosaga.saga;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SagaTransicaoRepository extends JpaRepository<SagaTransicao, Long> {
    List<SagaTransicao> findBySagaIdOrderByTimestampAsc(UUID sagaId);
}
