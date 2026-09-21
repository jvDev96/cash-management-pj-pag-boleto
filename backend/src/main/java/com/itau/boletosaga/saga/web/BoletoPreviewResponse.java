package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BoletoPreviewResponse(
        boolean encontrado,
        String beneficiario,
        BigDecimal valor,
        LocalDate vencimento,
        String tipo,
        String banco,
        String motivoFalha
) {
    public static BoletoPreviewResponse encontrado(String beneficiario, BigDecimal valor, LocalDate vencimento,
                                                     String tipo, String banco) {
        return new BoletoPreviewResponse(true, beneficiario, valor, vencimento, tipo, banco, null);
    }

    public static BoletoPreviewResponse naoEncontrado(String motivo) {
        return new BoletoPreviewResponse(false, null, null, null, null, null, motivo);
    }
}
