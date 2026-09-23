package com.itau.boletosaga.saga.messaging;

import com.itau.boletosaga.cliente.Cliente;
import com.itau.boletosaga.cliente.ClienteConfig;
import com.itau.boletosaga.cliente.ClienteRepository;
import com.rabbitmq.client.Channel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;

@Component
public class LiquidacaoListener {

    private static final Logger log = LoggerFactory.getLogger(LiquidacaoListener.class);

    private static final BigDecimal LIMITE_FALHA_LIQUIDACAO = new BigDecimal("500.00");

    private final RabbitTemplate rabbitTemplate;
    private final ClienteRepository clienteRepository;

    public LiquidacaoListener(RabbitTemplate rabbitTemplate, ClienteRepository clienteRepository) {
        this.rabbitTemplate = rabbitTemplate;
        this.clienteRepository = clienteRepository;
    }

    @RabbitListener(queues = SagaMessagingConfig.CMD_ENVIAR_LIQUIDACAO)
    @Transactional
    public void liquidar(EnviarLiquidacaoCommand comando, Channel channel,
                          @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            SimulacaoDelay.aplicar();
            LiquidacaoProcessadaEvent evento = processar(comando);
            rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.EVT_LIQUIDACAO_PROCESSADA, evento);
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro processando liquidacao (sagaId={})", comando.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    private LiquidacaoProcessadaEvent processar(EnviarLiquidacaoCommand comando) {
        if (comando.valor().compareTo(LIMITE_FALHA_LIQUIDACAO) >= 0) {
            return LiquidacaoProcessadaEvent.falha(comando.sagaId(), "Falha na liquidacao bancaria (simulado)");
        }
        Cliente cliente = clienteRepository.findById(ClienteConfig.ID_CLIENTE_DEMO)
                .orElseThrow(() -> new IllegalStateException("Cliente demo nao foi inicializado"));
        cliente.confirmarDebito(comando.valor());
        clienteRepository.save(cliente);
        return LiquidacaoProcessadaEvent.sucesso(comando.sagaId());
    }
}
