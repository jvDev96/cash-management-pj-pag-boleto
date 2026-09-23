package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import com.itau.boletosaga.saga.SagaState;

// DECISAO: sagaExistente/estadoSagaExistente entram no MESMO DTO de preview,
// nao um endpoint separado de "verificar duplicidade".
// PORQUE: o front ja chama esse endpoint a cada linha digitavel valida
// (useBoletoPreview) - anexar essa informacao aqui evita uma segunda
// chamada de rede so pra essa checagem, no mesmo espirito de "trazer tudo
// que a tela precisa numa chamada so" ja usado em PagamentoResponse.
public record BoletoPreviewResponse(
        boolean encontrado,
        String beneficiario,
        BigDecimal valor,
        LocalDate vencimento,
        String tipo,
        String banco,
        String motivoFalha,
        UUID sagaExistente,
        SagaState estadoSagaExistente
) {
    public static BoletoPreviewResponse encontrado(String beneficiario, BigDecimal valor, LocalDate vencimento,
                                                     String tipo, String banco,
                                                     UUID sagaExistente, SagaState estadoSagaExistente) {
        return new BoletoPreviewResponse(true, beneficiario, valor, vencimento, tipo, banco, null,
                sagaExistente, estadoSagaExistente);
    }

    public static BoletoPreviewResponse naoEncontrado(String motivo) {
        return new BoletoPreviewResponse(false, null, null, null, null, null, motivo, null, null);
    }
}
