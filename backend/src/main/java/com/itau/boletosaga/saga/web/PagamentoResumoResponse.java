package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.itau.boletosaga.saga.Saga;
import com.itau.boletosaga.saga.SagaState;

// DECISAO: DTO separado de PagamentoResponse, sem o historico.
// PORQUE: a tela de lista/historico nao precisa da timeline completa de cada
// pagamento, so o resumo (mesma logica de nao trazer mais dado do que a tela
// precisa) - buscar o historico linha a linha seria custo desnecessario numa
// lista paginada.
public record PagamentoResumoResponse(UUID sagaId, String beneficiario, BigDecimal valor, SagaState estado,
                                       Instant atualizadoEm) {
    public static PagamentoResumoResponse de(Saga saga) {
        return new PagamentoResumoResponse(saga.getId(), saga.getBeneficiario(), saga.getValor(), saga.getEstado(),
                saga.getAtualizadoEm());
    }
}
