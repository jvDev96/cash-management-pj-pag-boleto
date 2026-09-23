package com.itau.boletosaga.saga;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum SagaState {
    RECEBIDO,
    VALIDADO,
    SALDO_RESERVADO,
    LIQUIDACAO_ENVIADA,
    CONCLUIDO,
    SALDO_LIBERADO,
    REJEITADO,
    FALHOU;

    private static final Map<SagaState, Set<SagaState>> TRANSICOES_VALIDAS = new EnumMap<>(SagaState.class);

    static {
        TRANSICOES_VALIDAS.put(RECEBIDO, EnumSet.of(VALIDADO, REJEITADO));
        TRANSICOES_VALIDAS.put(VALIDADO, EnumSet.of(SALDO_RESERVADO, REJEITADO));
        TRANSICOES_VALIDAS.put(SALDO_RESERVADO, EnumSet.of(LIQUIDACAO_ENVIADA, SALDO_LIBERADO));
        TRANSICOES_VALIDAS.put(LIQUIDACAO_ENVIADA, EnumSet.of(CONCLUIDO, SALDO_LIBERADO));
        TRANSICOES_VALIDAS.put(SALDO_LIBERADO, EnumSet.of(REJEITADO, FALHOU));
        TRANSICOES_VALIDAS.put(CONCLUIDO, EnumSet.noneOf(SagaState.class));
        TRANSICOES_VALIDAS.put(REJEITADO, EnumSet.noneOf(SagaState.class));
        TRANSICOES_VALIDAS.put(FALHOU, EnumSet.noneOf(SagaState.class));
    }

    public boolean podeTransicionarPara(SagaState alvo) {
        return TRANSICOES_VALIDAS.get(this).contains(alvo);
    }

    public static final EnumSet<SagaState> ESTADOS_QUE_NAO_BLOQUEIAM_NOVO_PAGAMENTO =
            EnumSet.of(REJEITADO, FALHOU, SALDO_LIBERADO);
}
