package com.itau.boletosaga.saga.messaging;

public final class SimulacaoDelay {

    private static final long DELAY_MS = 3000;

    private SimulacaoDelay() {
    }

    public static void aplicar() {
        try {
            Thread.sleep(DELAY_MS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
