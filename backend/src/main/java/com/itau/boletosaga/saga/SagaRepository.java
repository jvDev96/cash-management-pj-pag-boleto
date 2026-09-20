package com.itau.boletosaga.saga;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SagaRepository extends JpaRepository<Saga, UUID> {
    Optional<Saga> findByIdempotencyKey(String idempotencyKey);
}
