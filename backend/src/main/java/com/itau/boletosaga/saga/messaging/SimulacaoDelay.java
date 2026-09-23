package com.itau.boletosaga.saga.messaging;

// DECISAO: delay artificial centralizado, usado pelos listeners simulados.
// PORQUE: sem isso, o processamento e rapido demais (sub-segundo) pra ver a
// timeline se atualizando de verdade numa demonstracao/video - cada etapa
// fica com o mesmo timestamp, quase instantaneo. So existe por causa disso;
// nao e requisito de negocio, nem estaria aqui numa integracao real (o
// servico externo de verdade teria sua propria latencia).
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
