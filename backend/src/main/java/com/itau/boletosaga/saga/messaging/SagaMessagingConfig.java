package com.itau.boletosaga.saga.messaging;

import org.springframework.amqp.core.AmqpAdmin;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Declarable;
import org.springframework.amqp.core.Declarables;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class SagaMessagingConfig {

    public static final String EXCHANGE = "saga.exchange";
    private static final String DLX = "saga.dlx";
    private static final String DLQ = "saga.dlq";

    // comandos: Orchestrator -> servico simulado
    public static final String CMD_VALIDAR_BOLETO = "saga.cmd.validar-boleto";
    public static final String CMD_RESERVAR_SALDO = "saga.cmd.reservar-saldo";
    public static final String CMD_ENVIAR_LIQUIDACAO = "saga.cmd.enviar-liquidacao";
    public static final String CMD_COMPENSAR_RESERVA = "saga.cmd.compensar-reserva";

    // eventos: servico simulado -> Orchestrator
    public static final String EVT_BOLETO_VALIDADO = "saga.evt.boleto-validado";
    public static final String EVT_SALDO_RESERVADO = "saga.evt.saldo-reservado";
    public static final String EVT_LIQUIDACAO_PROCESSADA = "saga.evt.liquidacao-processada";
    public static final String EVT_SALDO_LIBERADO = "saga.evt.saldo-liberado";

    private static final List<String> ROUTING_KEYS = List.of(
            CMD_VALIDAR_BOLETO, CMD_RESERVAR_SALDO, CMD_ENVIAR_LIQUIDACAO, CMD_COMPENSAR_RESERVA,
            EVT_BOLETO_VALIDADO, EVT_SALDO_RESERVADO, EVT_LIQUIDACAO_PROCESSADA, EVT_SALDO_LIBERADO
    );

    @Bean
    DirectExchange sagaExchange() {
        return new DirectExchange(EXCHANGE);
    }

    @Bean
    FanoutExchange sagaDeadLetterExchange() {
        return new FanoutExchange(DLX);
    }

    @Bean
    Queue deadLetterQueue() {
        return QueueBuilder.durable(DLQ).build();
    }

    @Bean
    Binding deadLetterBinding() {
        return BindingBuilder.bind(deadLetterQueue()).to(sagaDeadLetterExchange());
    }

    @Bean
    Declarables sagaQueues() {
        List<Declarable> declarables = new ArrayList<>();
        for (String routingKey : ROUTING_KEYS) {
            Queue queue = QueueBuilder.durable(routingKey)
                    .withArgument("x-dead-letter-exchange", DLX)
                    .build();
            declarables.add(queue);
            declarables.add(BindingBuilder.bind(queue).to(sagaExchange()).with(routingKey));
        }
        return new Declarables(declarables);
    }

    @Bean
    ApplicationListener<ApplicationReadyEvent> declaraFilasNaInicializacao(AmqpAdmin amqpAdmin) {
        return event -> amqpAdmin.initialize();
    }

    @Bean
    MessageConverter messageConverter(JsonMapper jsonMapper) {
        return new JacksonJsonMessageConverter(jsonMapper);
    }
}
