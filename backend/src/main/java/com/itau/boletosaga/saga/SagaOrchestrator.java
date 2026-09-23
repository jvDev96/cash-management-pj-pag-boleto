package com.itau.boletosaga.saga;

import com.itau.boletosaga.saga.messaging.BoletoValidadoEvent;
import com.itau.boletosaga.saga.messaging.CompensarReservaCommand;
import com.itau.boletosaga.saga.messaging.EnviarLiquidacaoCommand;
import com.itau.boletosaga.saga.messaging.LiquidacaoProcessadaEvent;
import com.itau.boletosaga.saga.messaging.ReservarSaldoCommand;
import com.itau.boletosaga.saga.messaging.SaldoLiberadoEvent;
import com.itau.boletosaga.saga.messaging.SaldoReservadoEvent;
import com.itau.boletosaga.saga.messaging.SagaMessagingConfig;
import com.itau.boletosaga.saga.messaging.ValidarBoletoCommand;
import com.rabbitmq.client.Channel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Component
public class SagaOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(SagaOrchestrator.class);

    private final SagaRepository sagaRepository;
    private final SagaTransicaoRepository sagaTransicaoRepository;
    private final RabbitTemplate rabbitTemplate;

    public SagaOrchestrator(SagaRepository sagaRepository, SagaTransicaoRepository sagaTransicaoRepository,
                             RabbitTemplate rabbitTemplate) {
        this.sagaRepository = sagaRepository;
        this.sagaTransicaoRepository = sagaTransicaoRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public record ResultadoIniciarSaga(Saga saga, boolean novaSaga) {
    }

    public ResultadoIniciarSaga iniciar(String idempotencyKey, String linhaDigitavel, BigDecimal valor) {
        Optional<Saga> existente = sagaRepository.findByIdempotencyKey(idempotencyKey);
        if (existente.isPresent()) {
            return new ResultadoIniciarSaga(existente.get(), false);
        }
        try {
            return new ResultadoIniciarSaga(criarNovaSaga(idempotencyKey, linhaDigitavel, valor), true);
        } catch (DataIntegrityViolationException e) {
            Saga saga = sagaRepository.findByIdempotencyKey(idempotencyKey).orElseThrow(() -> e);
            return new ResultadoIniciarSaga(saga, false);
        }
    }

    private Saga criarNovaSaga(String idempotencyKey, String linhaDigitavel, BigDecimal valor) {
        Saga saga = new Saga(idempotencyKey, linhaDigitavel, valor);
        salvarComHistorico(saga);
        rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.CMD_VALIDAR_BOLETO,
                new ValidarBoletoCommand(saga.getId(), linhaDigitavel));
        return saga;
    }

    private void salvarComHistorico(Saga saga) {
        sagaRepository.save(saga);
        registrarTransicao(saga);
    }

    private void registrarTransicao(Saga saga) {
        sagaTransicaoRepository.save(new SagaTransicao(saga.getId(), saga.getEstado(), Instant.now()));
    }

    private String gerarProtocolo() {
        int numero = ThreadLocalRandom.current().nextInt(10_000_000);
        return String.format("ITU-%07d", numero);
    }

    @RabbitListener(queues = SagaMessagingConfig.EVT_BOLETO_VALIDADO)
    public void aoValidarBoleto(BoletoValidadoEvent evento, Channel channel,
                                 @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            Saga saga = buscar(evento.sagaId());
            if (podeProcessar(evento.sagaId(), saga, SagaState.RECEBIDO)) {
                if (evento.sucesso()) {
                    saga.preencherDadosConsultados(evento.beneficiario(), evento.vencimento());
                    saga.transicionarPara(SagaState.VALIDADO);
                    salvarComHistorico(saga);
                    rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.CMD_RESERVAR_SALDO,
                            new ReservarSaldoCommand(saga.getId(), saga.getValor()));
                } else {
                    saga.registrarFalha(evento.motivoFalha());
                    saga.transicionarPara(SagaState.REJEITADO);
                    salvarComHistorico(saga);
                }
            }
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro processando evento boleto-validado (sagaId={})", evento.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    @RabbitListener(queues = SagaMessagingConfig.EVT_SALDO_RESERVADO)
    public void aoReservarSaldo(SaldoReservadoEvent evento, Channel channel,
                                 @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            Saga saga = buscar(evento.sagaId());
            if (podeProcessar(evento.sagaId(), saga, SagaState.VALIDADO)) {
                if (evento.sucesso()) {
                    saga.transicionarPara(SagaState.SALDO_RESERVADO);
                    registrarTransicao(saga);
                    saga.transicionarPara(SagaState.LIQUIDACAO_ENVIADA);
                    salvarComHistorico(saga);
                    rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.CMD_ENVIAR_LIQUIDACAO,
                            new EnviarLiquidacaoCommand(saga.getId(), saga.getValor()));
                } else {
                    saga.registrarFalha(evento.motivoFalha());
                    saga.transicionarPara(SagaState.REJEITADO);
                    salvarComHistorico(saga);
                }
            }
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro processando evento saldo-reservado (sagaId={})", evento.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    @RabbitListener(queues = SagaMessagingConfig.EVT_LIQUIDACAO_PROCESSADA)
    public void aoProcessarLiquidacao(LiquidacaoProcessadaEvent evento, Channel channel,
                                       @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            Saga saga = buscar(evento.sagaId());
            if (podeProcessar(evento.sagaId(), saga, SagaState.LIQUIDACAO_ENVIADA)) {
                if (evento.sucesso()) {
                    saga.transicionarPara(SagaState.CONCLUIDO);
                    saga.definirProtocolo(gerarProtocolo());
                    salvarComHistorico(saga);
                } else {
                    saga.registrarFalha(evento.motivoFalha());
                    saga.transicionarPara(SagaState.SALDO_LIBERADO);
                    salvarComHistorico(saga);
                    rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.CMD_COMPENSAR_RESERVA,
                            new CompensarReservaCommand(saga.getId(), saga.getValor()));
                }
            }
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro processando evento liquidacao-processada (sagaId={})", evento.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    @RabbitListener(queues = SagaMessagingConfig.EVT_SALDO_LIBERADO)
    public void aoLiberarSaldo(SaldoLiberadoEvent evento, Channel channel,
                                @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            Saga saga = buscar(evento.sagaId());
            if (podeProcessar(evento.sagaId(), saga, SagaState.SALDO_LIBERADO)) {
                saga.transicionarPara(SagaState.FALHOU);
                salvarComHistorico(saga);
            }
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro processando evento saldo-liberado (sagaId={})", evento.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    private Saga buscar(UUID sagaId) {
        return sagaRepository.findById(sagaId).orElse(null);
    }

    private boolean podeProcessar(UUID sagaId, Saga saga, SagaState estadoEsperado) {
        if (saga == null) {
            throw new IllegalStateException("Evento recebido para sagaId inexistente: " + sagaId);
        }
        if (saga.getEstado() != estadoEsperado) {
            log.warn("Evento duplicado ou fora de ordem ignorado: sagaId={}, estadoAtual={}, estadoEsperado={}",
                    saga.getId(), saga.getEstado(), estadoEsperado);
            return false;
        }
        return true;
    }
}
