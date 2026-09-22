package com.itau.boletosaga.saga.web;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.itau.boletosaga.saga.Saga;
import com.itau.boletosaga.saga.SagaState;
import com.itau.boletosaga.saga.SagaTransicao;

// DECISAO: DTO separado da entidade Saga, nao a entidade devolvida direto.
// PORQUE: a entidade carrega detalhe de persistencia (@Version, por exemplo)
// que nao e assunto da API. Desacoplar o contrato HTTP do formato do banco
// significa que um pode mudar sem quebrar o outro.
public record PagamentoResponse(UUID sagaId, SagaState estado, String motivoFalha, Instant atualizadoEm,
                                 String protocolo, List<HistoricoEntry> historico) {

    // DECISAO: historico embutido na mesma resposta, nao um endpoint separado.
    // PORQUE: o front faz polling nesse endpoint repetidamente - trazer tudo
    // que a timeline precisa numa chamada so evita orquestrar duas
    // requisicoes por tick de polling.
    public record HistoricoEntry(SagaState estado, Instant timestamp) {
        public static HistoricoEntry de(SagaTransicao transicao) {
            return new HistoricoEntry(transicao.getEstado(), transicao.getTimestamp());
        }
    }

    public static PagamentoResponse de(Saga saga, List<SagaTransicao> transicoes) {
        List<HistoricoEntry> historico = transicoes.stream().map(HistoricoEntry::de).toList();
        return new PagamentoResponse(saga.getId(), saga.getEstado(), saga.getMotivoFalha(), saga.getAtualizadoEm(),
                saga.getProtocolo(), historico);
    }
}
