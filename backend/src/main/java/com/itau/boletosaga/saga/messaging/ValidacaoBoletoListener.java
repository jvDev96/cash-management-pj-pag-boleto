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
import java.time.LocalDate;

@Component
public class ValidacaoBoletoListener {

    private static final Logger log = LoggerFactory.getLogger(ValidacaoBoletoListener.class);

    private final RabbitTemplate rabbitTemplate;

    public ValidacaoBoletoListener(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = SagaMessagingConfig.CMD_VALIDAR_BOLETO)
    public void validar(ValidarBoletoCommand comando, Channel channel,
                         @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            SimulacaoDelay.aplicar();
            BoletoValidadoEvent evento = processar(comando);
            rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.EVT_BOLETO_VALIDADO, evento);
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro processando validacao do boleto (sagaId={})", comando.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    private BoletoValidadoEvent processar(ValidarBoletoCommand comando) {
        if (comando.linhaDigitavel().endsWith("0000")) {
            return BoletoValidadoEvent.falha(comando.sagaId(), "Boleto nao encontrado");
        }
        return BoletoValidadoEvent.sucesso(comando.sagaId(), "Beneficiario Simulado LTDA", LocalDate.now().plusDays(5));
    }
}
