package com.itau.boletosaga.saga;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SagaRepository extends JpaRepository<Saga, UUID> {
    Optional<Saga> findByIdempotencyKey(String idempotencyKey);

    List<Saga> findByEstadoInAndAtualizadoEmBefore(List<SagaState> estados, Instant limite);

    Optional<Saga> findFirstByLinhaDigitavelAndEstadoNotInOrderByCriadoEmDesc(
            String linhaDigitavel, Collection<SagaState> estadosExcluidos);
}
