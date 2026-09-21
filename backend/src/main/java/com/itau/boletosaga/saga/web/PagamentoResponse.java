package com.itau.boletosaga.saga.web;

import java.time.Instant;
import java.util.UUID;

import com.itau.boletosaga.saga.Saga;
import com.itau.boletosaga.saga.SagaState;

// DECISAO: DTO separado da entidade Saga, nao a entidade devolvida direto.
// PORQUE: a entidade carrega detalhe de persistencia (@Version, por exemplo)
// que nao e assunto da API. Desacoplar o contrato HTTP do formato do banco
// significa que um pode mudar sem quebrar o outro.
public record PagamentoResponse(UUID sagaId, SagaState estado, String motivoFalha, Instant atualizadoEm) {

    public static PagamentoResponse de(Saga saga) {
        return new PagamentoResponse(saga.getId(), saga.getEstado(), saga.getMotivoFalha(), saga.getAtualizadoEm());
    }
}
