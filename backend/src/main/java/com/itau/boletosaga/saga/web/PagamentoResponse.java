package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.itau.boletosaga.saga.Saga;
import com.itau.boletosaga.saga.SagaState;
import com.itau.boletosaga.saga.SagaTransicao;

public record PagamentoResponse(UUID sagaId, SagaState estado, String motivoFalha, Instant atualizadoEm,
                                 String protocolo, List<HistoricoEntry> historico,
                                 String beneficiario, BigDecimal valor, LocalDate vencimento, String linhaDigitavel) {

    public record HistoricoEntry(SagaState estado, Instant timestamp) {
        public static HistoricoEntry de(SagaTransicao transicao) {
            return new HistoricoEntry(transicao.getEstado(), transicao.getTimestamp());
        }
    }

    public static PagamentoResponse de(Saga saga, List<SagaTransicao> transicoes) {
        List<HistoricoEntry> historico = transicoes.stream().map(HistoricoEntry::de).toList();
        return new PagamentoResponse(saga.getId(), saga.getEstado(), saga.getMotivoFalha(), saga.getAtualizadoEm(),
                saga.getProtocolo(), historico,
                saga.getBeneficiario(), saga.getValor(), saga.getVencimento(), saga.getLinhaDigitavel());
    }
}
