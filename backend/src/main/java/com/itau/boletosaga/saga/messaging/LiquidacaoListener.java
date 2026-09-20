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
public class LiquidacaoListener {

    private static final Logger log = LoggerFactory.getLogger(LiquidacaoListener.class);

    // DECISAO: so verifica o limiar de R$500 aqui, sem repetir o de R$700.
    // PORQUE: um valor >= R$700 ja teria sido barrado antes, na reserva de
    // saldo - no fluxo normal, a saga nunca chega ate aqui com esse valor.
    // E uma simulacao pro case, nao uma validacao defensiva de producao.
    private static final BigDecimal LIMITE_FALHA_LIQUIDACAO = new BigDecimal("500.00");

    private final RabbitTemplate rabbitTemplate;

    public LiquidacaoListener(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @RabbitListener(queues = SagaMessagingConfig.CMD_ENVIAR_LIQUIDACAO)
    public void liquidar(EnviarLiquidacaoCommand comando, Channel channel,
                          @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            LiquidacaoProcessadaEvent evento = processar(comando);
            channel.basicAck(deliveryTag, false);
            rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.EVT_LIQUIDACAO_PROCESSADA, evento);
        } catch (Exception e) {
            log.error("Erro processando liquidacao (sagaId={})", comando.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    private LiquidacaoProcessadaEvent processar(EnviarLiquidacaoCommand comando) {
        if (comando.valor().compareTo(LIMITE_FALHA_LIQUIDACAO) >= 0) {
            return LiquidacaoProcessadaEvent.falha(comando.sagaId(), "Falha na liquidacao bancaria (simulado)");
        }
        return LiquidacaoProcessadaEvent.sucesso(comando.sagaId());
    }
}
