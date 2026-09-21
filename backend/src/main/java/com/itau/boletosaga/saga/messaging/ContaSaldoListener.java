package com.itau.boletosaga.saga.messaging;

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

@Component
public class ContaSaldoListener {

    private static final Logger log = LoggerFactory.getLogger(ContaSaldoListener.class);

    // DECISAO: limiar de R$700 pra "saldo insuficiente" na reserva.
    // PORQUE: precisa bater com a regra deterministica combinada - dar pra
    // escolher o caminho da saga so pelo valor digitado, sem depender de sorte.
    private static final BigDecimal LIMITE_SALDO_INSUFICIENTE = new BigDecimal("700.00");

    private final RabbitTemplate rabbitTemplate;

    public ContaSaldoListener(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = SagaMessagingConfig.CMD_RESERVAR_SALDO)
    public void reservar(ReservarSaldoCommand comando, Channel channel,
                          @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            SaldoReservadoEvent evento = processarReserva(comando);
            // ver DECISAO sobre ordem publish-antes-do-ack em ValidacaoBoletoListener
            rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.EVT_SALDO_RESERVADO, evento);
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro reservando saldo (sagaId={})", comando.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    @RabbitListener(queues = SagaMessagingConfig.CMD_COMPENSAR_RESERVA)
    public void compensar(CompensarReservaCommand comando, Channel channel,
                           @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.EVT_SALDO_LIBERADO,
                    new SaldoLiberadoEvent(comando.sagaId()));
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro compensando reserva de saldo (sagaId={})", comando.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    private SaldoReservadoEvent processarReserva(ReservarSaldoCommand comando) {
        if (comando.valor().compareTo(LIMITE_SALDO_INSUFICIENTE) >= 0) {
            return SaldoReservadoEvent.falha(comando.sagaId(), "Saldo insuficiente");
        }
        return SaldoReservadoEvent.sucesso(comando.sagaId());
    }
}
