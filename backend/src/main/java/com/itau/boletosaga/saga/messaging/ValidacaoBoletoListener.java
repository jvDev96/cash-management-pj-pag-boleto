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

// DECISAO: este listener simula o servico "Validacao de Boleto" (LIQ na
// figura do PDF) dentro do mesmo processo Spring Boot, consumindo de uma
// fila de verdade, nao chamado como metodo Java direto.
// PORQUE: o PDF permite/pede que o servico externo seja mockado - mas o
// ponto do case e demonstrar mensageria assincrona de verdade. Simular via
// fila (em vez de so um metodo Java) mantem o desacoplamento real: o
// Orchestrator nao sabe (nem deveria saber) que isso roda no mesmo processo.
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
            // DECISAO: publica a resposta ANTES de confirmar (ack) a mensagem
            // original.
            // PORQUE: se o ack viesse primeiro e o convertAndSend falhasse
            // depois, a mensagem original ja teria sumido (confirmada) mas a
            // resposta nunca teria sido publicada - perda silenciosa, sem
            // como recuperar. Nessa ordem, se convertAndSend falhar, o catch
            // ainda pode dar nack valido (a mensagem original nunca foi
            // confirmada) e ela vai pra DLQ, onde pode ser investigada.
            rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.EVT_BOLETO_VALIDADO, evento);
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro processando validacao do boleto (sagaId={})", comando.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    // DECISAO: regra deterministica pelo final da linha digitavel, nao
    // aleatoria.
    // PORQUE: pra demonstrar cada caminho da saga (feliz e de falha) de forma
    // controlavel e repetivel no video/entrevista - voce escolhe o numero,
    // nao depende de sorte.
    private BoletoValidadoEvent processar(ValidarBoletoCommand comando) {
        if (comando.linhaDigitavel().endsWith("0000")) {
            return BoletoValidadoEvent.falha(comando.sagaId(), "Boleto nao encontrado");
        }
        return BoletoValidadoEvent.sucesso(comando.sagaId(), "Beneficiario Simulado LTDA", LocalDate.now().plusDays(5));
    }
}
