package com.itau.boletosaga.saga.messaging;

import com.itau.boletosaga.cliente.Cliente;
import com.itau.boletosaga.cliente.ClienteConfig;
import com.itau.boletosaga.cliente.ClienteRepository;
import com.itau.boletosaga.cliente.SaldoInsuficienteException;
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

// DECISAO: reserva/compensacao mexem no saldo DISPONIVEL de verdade
// (Cliente, no Postgres), nao mais num limiar fixo comparado contra o valor
// do boleto.
// PORQUE: o limiar antigo (>=R$700 falha) era uma simulacao pura, sem estado
// nenhum por tras. Isso: (1) faz reserva/compensacao terem efeito real e
// observavel (GET /cliente/saldo muda de verdade); (2) preserva a mesma
// regra deterministica de demonstracao ja documentada - o saldo inicial do
// cliente demo e R$699,99 (ClienteConfig.SALDO_INICIAL_DEMO), entao um
// boleto de R$700+ ainda falha por saldo insuficiente na primeira tentativa,
// so que agora e consequencia real do saldo, nao uma constante solta aqui.
@Component
public class ContaSaldoListener {

    private static final Logger log = LoggerFactory.getLogger(ContaSaldoListener.class);

    private final RabbitTemplate rabbitTemplate;
    private final ClienteRepository clienteRepository;

    public ContaSaldoListener(RabbitTemplate rabbitTemplate, ClienteRepository clienteRepository) {
        this.rabbitTemplate = rabbitTemplate;
        this.clienteRepository = clienteRepository;
    }

    @RabbitListener(queues = SagaMessagingConfig.CMD_RESERVAR_SALDO)
    @Transactional
    public void reservar(ReservarSaldoCommand comando, Channel channel,
                          @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            SimulacaoDelay.aplicar();
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
    @Transactional
    public void compensar(CompensarReservaCommand comando, Channel channel,
                           @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            SimulacaoDelay.aplicar();
            Cliente cliente = buscarClienteDemo();
            cliente.liberarReserva(comando.valor());
            clienteRepository.save(cliente);
            rabbitTemplate.convertAndSend(SagaMessagingConfig.EXCHANGE, SagaMessagingConfig.EVT_SALDO_LIBERADO,
                    new SaldoLiberadoEvent(comando.sagaId()));
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("Erro compensando reserva de saldo (sagaId={})", comando.sagaId(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }

    private SaldoReservadoEvent processarReserva(ReservarSaldoCommand comando) {
        Cliente cliente = buscarClienteDemo();
        try {
            cliente.reservar(comando.valor());
            clienteRepository.save(cliente);
            return SaldoReservadoEvent.sucesso(comando.sagaId());
        } catch (SaldoInsuficienteException e) {
            return SaldoReservadoEvent.falha(comando.sagaId(), "Saldo insuficiente");
        }
    }

    private Cliente buscarClienteDemo() {
        return clienteRepository.findById(ClienteConfig.ID_CLIENTE_DEMO)
                .orElseThrow(() -> new IllegalStateException("Cliente demo nao foi inicializado"));
    }
}
