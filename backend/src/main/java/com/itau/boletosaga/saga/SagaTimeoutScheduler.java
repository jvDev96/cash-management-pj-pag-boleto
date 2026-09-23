package com.itau.boletosaga.saga;

import com.itau.boletosaga.saga.messaging.CompensarReservaCommand;
import com.itau.boletosaga.saga.messaging.SagaMessagingConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Component
public class SagaTimeoutScheduler {

    private static final Logger log = LoggerFactory.getLogger(SagaTimeoutScheduler.class);

    private static final List<SagaState> ESTADOS_MONITORADOS = List.of(
            SagaState.RECEBIDO, SagaState.VALIDADO, SagaState.LIQUIDACAO_ENVIADA, SagaState.SALDO_LIBERADO
    );

    private final SagaRepository sagaRepository;
    private final SagaTransicaoRepository sagaTransicaoRepository;
    private final RabbitTemplate rabbitTemplate;
    private final long timeoutSegundos;

    public SagaTimeoutScheduler(SagaRepository sagaRepository, SagaTransicaoRepository sagaTransicaoRepository,
                                 RabbitTemplate rabbitTemplate,
                                 @Value("${saga.timeout.segundos:30}") long timeoutSegundos) {
        this.sagaRepository = sagaRepository;
        this.sagaTransicaoRepository = sagaTransicaoRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.timeoutSegundos = timeoutSegundos;
    }

    @Scheduled(fixedDelayString = "${saga.timeout.intervalo-verificacao-ms:10000}")
    public void verificarSagasPresas() {
        Instant limite = Instant.now().minus(Duration.ofSeconds(timeoutSegundos));
        List<Saga> presas = sagaRepository.findByEstadoInAndAtualizadoEmBefore(ESTADOS_MONITORADOS, limite);

        for (Saga saga : presas) {
            try {
                aplicarTimeout(saga);
            } catch (OptimisticLockingFailureException e) {
                log.info("Saga {} mudou de estado antes do timeout ser aplicado - ignorando.", saga.getId());
            } catch (Exception e) {
                log.error("Erro aplicando timeout na saga {}", saga.getId(), e);
            }
        }
    }

    private void aplicarTimeout(Saga saga) {
        SagaState estadoOriginal = saga.getEstado();
        log.warn("Timeout detectado: sagaId={}, estado={}, parada desde={}",
                saga.getId(), estadoOriginal, saga.getAtualizadoEm());

        switch (estadoOriginal) {
            case RECEBIDO, VALIDADO -> {
                saga.registrarFalha("Timeout aguardando resposta na etapa " + estadoOriginal);
                saga.transicionarPara(SagaState.REJEITADO);
                salvarComHistorico(saga);
            }
            case LIQUIDACAO_ENVIADA -> {
                saga.registrarFalha("Timeout aguardando confirmacao da liquidacao");
                saga.transicionarPara(SagaState.SALDO_LIBERADO);
                salvarComHistorico(saga);
                rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.CMD_COMPENSAR_RESERVA,
                        new CompensarReservaCommand(saga.getId(), saga.getValor()));
            }
            case SALDO_LIBERADO -> {
                saga.transicionarPara(SagaState.FALHOU);
                salvarComHistorico(saga);
            }
            default -> log.warn("Timeout monitorando um estado inesperado: {}", estadoOriginal);
        }
    }

    private void salvarComHistorico(Saga saga) {
        sagaRepository.save(saga);
        sagaTransicaoRepository.save(new SagaTransicao(saga.getId(), saga.getEstado(), Instant.now()));
    }
}
