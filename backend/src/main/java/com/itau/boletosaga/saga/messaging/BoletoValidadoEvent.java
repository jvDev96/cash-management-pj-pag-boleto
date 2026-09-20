package com.itau.boletosaga.saga.messaging;

import java.time.LocalDate;
import java.util.UUID;

public record BoletoValidadoEvent(
        UUID sagaId,
        boolean sucesso,
        String beneficiario,
        LocalDate vencimento,
        String motivoFalha
) {

    // DECISAO: metodos de fabrica nomeados (sucesso/falha) em vez de deixar
    // quem monta o evento chamar "new BoletoValidadoEvent(id, true, x, y, null)"
    // direto.
    // PORQUE: um construtor com 5 posicoes, incluindo um boolean solto e um
    // null implicito, nao deixa claro no ponto de chamada qual e o caminho
    // feliz e qual e o de falha. sucesso(...)/falha(...) leem como frase.
    public static BoletoValidadoEvent sucesso(UUID sagaId, String beneficiario, LocalDate vencimento) {
        return new BoletoValidadoEvent(sagaId, true, beneficiario, vencimento, null);
    }

    public static BoletoValidadoEvent falha(UUID sagaId, String motivo) {
        return new BoletoValidadoEvent(sagaId, false, null, null, motivo);
    }
}
