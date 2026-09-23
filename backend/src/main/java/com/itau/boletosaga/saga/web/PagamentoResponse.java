package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.itau.boletosaga.saga.Saga;
import com.itau.boletosaga.saga.SagaState;
import com.itau.boletosaga.saga.SagaTransicao;

// DECISAO: DTO separado da entidade Saga, nao a entidade devolvida direto.
// PORQUE: a entidade carrega detalhe de persistencia (@Version, por exemplo)
// que nao e assunto da API. Desacoplar o contrato HTTP do formato do banco
// significa que um pode mudar sem quebrar o outro.
// DECISAO: beneficiario/valor/vencimento/linhaDigitavel entram aqui, nao so
// estado/historico.
// PORQUE: o PaymentStatusTracker (front) precisa mostrar DE QUAL boleto se
// trata, tanto no acompanhamento ao vivo quanto ao abrir um item do
// historico - sem isso, so dava pra ver a timeline de estados, nunca os
// dados do documento. banco/tipo NAO entram aqui de proposito: sao
// derivados so da linhaDigitavel, e o front ja tem essa logica pronta
// (detectarBanco/detectarFormato) - reexpor no backend seria duplicar a
// mesma regra em dois lugares.
public record PagamentoResponse(UUID sagaId, SagaState estado, String motivoFalha, Instant atualizadoEm,
                                 String protocolo, List<HistoricoEntry> historico,
                                 String beneficiario, BigDecimal valor, LocalDate vencimento, String linhaDigitavel) {

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
                saga.getProtocolo(), historico,
                saga.getBeneficiario(), saga.getValor(), saga.getVencimento(), saga.getLinhaDigitavel());
    }
}
