package com.itau.boletosaga.saga;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SagaRepository extends JpaRepository<Saga, UUID> {
    Optional<Saga> findByIdempotencyKey(String idempotencyKey);

    // DECISAO: query derivada composta (In + Before) em vez de @Query com JPQL.
    // PORQUE: o Spring Data consegue montar a query so pelo nome do metodo
    // ate um certo ponto de complexidade - "estado esta numa lista E
    // atualizadoEm e anterior a X" ainda cabe nisso. So partiria pra @Query
    // se a condicao ficasse mais complexa que isso.
    List<Saga> findByEstadoInAndAtualizadoEmBefore(List<SagaState> estados, Instant limite);
}
