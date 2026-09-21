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
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.UUID;

// DECISAO: SagaOrchestrator mora em "saga" (domínio), não em "saga.messaging".
// PORQUE: ele é quem DECIDE o que fazer a seguir, não so transporta mensagem -
// mora mais perto de Saga/SagaState do que da infraestrutura pura de fila. Os
// listeners simulados ficam em messaging porque sao adaptadores substituindo
// sistemas externos; o Orchestrator é o cerebro do proprio case.
@Component
public class SagaOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(SagaOrchestrator.class);

    private final SagaRepository sagaRepository;
    private final RabbitTemplate rabbitTemplate;

    public SagaOrchestrator(SagaRepository sagaRepository, RabbitTemplate rabbitTemplate) {
        this.sagaRepository = sagaRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    // DECISAO: checa se ja existe uma saga com essa idempotencyKey antes de
    // criar uma nova.
    // PORQUE: primeira camada de defesa do RNF01. A segunda camada (UNIQUE
    // constraint no banco, pra corrida de concorrencia real entre duas
    // requisicoes simultaneas com a mesma chave) fica pro endpoint REST, que
    // ainda vamos construir - la faz mais sentido tratar
    // DataIntegrityViolationException.
    // LIMITACAO CONHECIDA: salvar a saga e publicar o comando nao sao
    // atomicos (sao dois sistemas diferentes). Se o publish falhar depois do
    // save, a saga fica presa em RECEBIDO pra sempre, sem o comando ter sido
    // enviado - e exatamente o tipo de caso que o timeout/scheduler (RNF03,
    // proximo passo do roadmap) existe pra detectar e reagir.
    public Saga iniciar(String idempotencyKey, String linhaDigitavel, BigDecimal valor) {
        return sagaRepository.findByIdempotencyKey(idempotencyKey)
                .orElseGet(() -> criarNovaSaga(idempotencyKey, linhaDigitavel, valor));
    }

    private Saga criarNovaSaga(String idempotencyKey, String linhaDigitavel, BigDecimal valor) {
        Saga saga = new Saga(idempotencyKey, linhaDigitavel, valor);
        sagaRepository.save(saga);
        rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.CMD_VALIDAR_BOLETO,
                new ValidarBoletoCommand(saga.getId(), linhaDigitavel));
        return saga;
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
                    sagaRepository.save(saga);
                    rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.CMD_RESERVAR_SALDO,
                            new ReservarSaldoCommand(saga.getId(), saga.getValor()));
                } else {
                    saga.registrarFalha(evento.motivoFalha());
                    saga.transicionarPara(SagaState.REJEITADO);
                    sagaRepository.save(saga);
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
                    // DECISAO: as duas transicoes (SALDO_RESERVADO ->
                    // LIQUIDACAO_ENVIADA) em memoria, UM unico save, e SO
                    // DEPOIS o publish.
                    // PORQUE: a versao anterior salvava SALDO_RESERVADO,
                    // publicava, e so depois salvava LIQUIDACAO_ENVIADA -
                    // deixando uma janela real onde, se a app caisse entre o
                    // publish (que ja tinha sido enviado) e o segundo save,
                    // a resposta do LiquidacaoListener chegaria rapido e
                    // encontraria o estado desatualizado (SALDO_RESERVADO em
                    // vez de LIQUIDACAO_ENVIADA) - o podeProcessar trataria
                    // essa resposta legitima como "fora de ordem" e
                    // descartaria, perdendo o resultado real da liquidacao.
                    // Sem essa janela: ou o estado final ja esta salvo
                    // ANTES do publish (e a resposta sempre encontra o
                    // estado certo), ou o publish falha e a saga fica presa
                    // em LIQUIDACAO_ENVIADA sem o comando ter saido de
                    // verdade - cenario seguro, que o scheduler de timeout
                    // sabe resolver reenviando o comando (nada externo
                    // aconteceu ainda nesse caso).
                    saga.transicionarPara(SagaState.SALDO_RESERVADO);
                    saga.transicionarPara(SagaState.LIQUIDACAO_ENVIADA);
                    sagaRepository.save(saga);
                    rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.CMD_ENVIAR_LIQUIDACAO,
                            new EnviarLiquidacaoCommand(saga.getId(), saga.getValor()));
                } else {
                    saga.registrarFalha(evento.motivoFalha());
                    saga.transicionarPara(SagaState.REJEITADO);
                    sagaRepository.save(saga);
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
                    sagaRepository.save(saga);
                } else {
                    saga.registrarFalha(evento.motivoFalha());
                    saga.transicionarPara(SagaState.SALDO_LIBERADO);
                    sagaRepository.save(saga);
                    rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.CMD_COMPENSAR_RESERVA,
                            new CompensarReservaCommand(saga.getId()));
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
                sagaRepository.save(saga);
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

    // DECISAO: guarda de idempotencia baseada em ESTADO, nao em chave.
    // PORQUE: se um evento ja foi processado antes (redelivery do RabbitMQ -
    // ver CONCEITOS.md sobre at-least-once), a saga ja vai estar num estado
    // DIFERENTE do esperado aqui. Nesse caso so confirma (ack) sem reaplicar
    // a transicao - em vez de deixar transicionarPara(...) lancar excecao e
    // mandar um evento duplicado, mas inofensivo, pra DLQ por engano.
    private boolean podeProcessar(UUID sagaId, Saga saga, SagaState estadoEsperado) {
        if (saga == null) {
            log.error("Evento recebido para sagaId inexistente: {}", sagaId);
            return false;
        }
        if (saga.getEstado() != estadoEsperado) {
            log.warn("Evento duplicado ou fora de ordem ignorado: sagaId={}, estadoAtual={}, estadoEsperado={}",
                    saga.getId(), saga.getEstado(), estadoEsperado);
            return false;
        }
        return true;
    }
}
