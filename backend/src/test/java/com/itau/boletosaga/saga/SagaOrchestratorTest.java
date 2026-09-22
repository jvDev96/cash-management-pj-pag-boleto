package com.itau.boletosaga.saga;

import com.itau.boletosaga.saga.messaging.BoletoValidadoEvent;
import com.itau.boletosaga.saga.messaging.SaldoReservadoEvent;
import com.itau.boletosaga.saga.messaging.SagaMessagingConfig;
import com.rabbitmq.client.Channel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// DECISAO: nao usa @SpringBootTest - construimos o SagaOrchestrator na mao,
// com mocks do SagaRepository e do RabbitTemplate.
// PORQUE: e a mesma logica de sempre - testar a regra de negocio isolada de
// infraestrutura de verdade. Constructor injection torna isso trivial: sem
// Spring nenhum, so "new SagaOrchestrator(mockRepo, mockRabbit)".
//
// NOTA sobre convertAndSend(Object): o RabbitTemplate tem varias sobrecargas
// com 3 parametros parecidos (uma com exchange+routingKey+mensagem, outra
// com routingKey+mensagem+MessagePostProcessor) - o compilador nao consegue
// decidir sozinho qual verificar. O cast "(Object) any(...)" inline resolve
// a ambiguidade. IMPORTANTE: o matcher precisa ficar na MESMA instrucao da
// chamada verificada - guardar o resultado de any()/eq() numa variavel pra
// usar depois quebra o mecanismo interno do Mockito (ele espera consumir o
// matcher imediatamente).
@ExtendWith(MockitoExtension.class)
class SagaOrchestratorTest {

    @Mock
    private SagaRepository sagaRepository;

    @Mock
    private SagaTransicaoRepository sagaTransicaoRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private Channel channel;

    private SagaOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        orchestrator = new SagaOrchestrator(sagaRepository, sagaTransicaoRepository, rabbitTemplate);
    }

    @Test
    void iniciarCriaSagaNovaEPublicaComandoDeValidacao() {
        when(sagaRepository.findByIdempotencyKey("chave-1")).thenReturn(Optional.empty());

        SagaOrchestrator.ResultadoIniciarSaga resultado =
                orchestrator.iniciar("chave-1", "34191790010104351004791020150008", new BigDecimal("100.00"));

        assertTrue(resultado.novaSaga());
        verify(sagaRepository).save(any(Saga.class));
        verify(rabbitTemplate).convertAndSend(eq(SagaMessagingConfig.EXCHANGE),
                eq(SagaMessagingConfig.CMD_VALIDAR_BOLETO), (Object) any());
    }

    // DECISAO: prova formal de que criar uma saga nova ja grava a primeira
    // linha do historico (RECEBIDO) - sem isso a timeline nao teria
    // timestamp pra essa etapa.
    @Test
    void iniciarCriaSagaERegistraTransicaoRecebidoNoHistorico() {
        when(sagaRepository.findByIdempotencyKey("chave-1")).thenReturn(Optional.empty());

        SagaOrchestrator.ResultadoIniciarSaga resultado =
                orchestrator.iniciar("chave-1", "34191790010104351004791020150008", new BigDecimal("100.00"));

        ArgumentCaptor<SagaTransicao> captor = ArgumentCaptor.forClass(SagaTransicao.class);
        verify(sagaTransicaoRepository).save(captor.capture());
        assertEquals(SagaState.RECEBIDO, captor.getValue().getEstado());
        assertEquals(resultado.saga().getId(), captor.getValue().getSagaId());
    }

    @Test
    void iniciarComChaveJaExistenteDevolveASagaExistenteSemCriarNemPublicarDeNovo() {
        Saga existente = new Saga("chave-1", "34191790010104351004791020150008", new BigDecimal("100.00"));
        when(sagaRepository.findByIdempotencyKey("chave-1")).thenReturn(Optional.of(existente));

        SagaOrchestrator.ResultadoIniciarSaga resultado =
                orchestrator.iniciar("chave-1", "34191790010104351004791020150008", new BigDecimal("100.00"));

        assertFalse(resultado.novaSaga());
        assertEquals(existente, resultado.saga());
        verify(sagaRepository, never()).save(any());
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), (Object) any());
    }

    @Test
    void aoValidarBoletoComSucessoTransicionaParaValidadoEPublicaReservarSaldo() throws IOException {
        Saga saga = new Saga("chave-1", "34191790010104351004791020150008", new BigDecimal("100.00"));
        when(sagaRepository.findById(saga.getId())).thenReturn(Optional.of(saga));

        BoletoValidadoEvent evento = BoletoValidadoEvent.sucesso(saga.getId(), "Fulano LTDA", LocalDate.now().plusDays(3));
        orchestrator.aoValidarBoleto(evento, channel, 1L);

        assertEquals(SagaState.VALIDADO, saga.getEstado());
        verify(rabbitTemplate).convertAndSend(eq(SagaMessagingConfig.EXCHANGE),
                eq(SagaMessagingConfig.CMD_RESERVAR_SALDO), (Object) any());
        verify(channel).basicAck(1L, false);
    }

    @Test
    void aoValidarBoletoComSucessoRegistraTransicaoValidadoNoHistorico() throws IOException {
        Saga saga = new Saga("chave-1", "34191790010104351004791020150008", new BigDecimal("100.00"));
        when(sagaRepository.findById(saga.getId())).thenReturn(Optional.of(saga));

        BoletoValidadoEvent evento = BoletoValidadoEvent.sucesso(saga.getId(), "Fulano LTDA", LocalDate.now().plusDays(3));
        orchestrator.aoValidarBoleto(evento, channel, 1L);

        ArgumentCaptor<SagaTransicao> captor = ArgumentCaptor.forClass(SagaTransicao.class);
        verify(sagaTransicaoRepository).save(captor.capture());
        assertEquals(SagaState.VALIDADO, captor.getValue().getEstado());
    }

    @Test
    void aoValidarBoletoComFalhaTransicionaParaRejeitadoSemPublicarComando() throws IOException {
        Saga saga = new Saga("chave-1", "34191790010104351004791020150008", new BigDecimal("100.00"));
        when(sagaRepository.findById(saga.getId())).thenReturn(Optional.of(saga));

        BoletoValidadoEvent evento = BoletoValidadoEvent.falha(saga.getId(), "Boleto nao encontrado");
        orchestrator.aoValidarBoleto(evento, channel, 1L);

        assertEquals(SagaState.REJEITADO, saga.getEstado());
        assertEquals("Boleto nao encontrado", saga.getMotivoFalha());
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), (Object) any());
        verify(channel).basicAck(1L, false);
    }

    // DECISAO: este teste e a prova formal da guarda de idempotencia
    // (podeProcessar) - o mesmo mecanismo que discutimos na Q3 do quiz.
    @Test
    void eventoDuplicadoEIgnoradoSemReprocessarMasAindaConfirmaAMensagem() throws IOException {
        Saga saga = new Saga("chave-1", "34191790010104351004791020150008", new BigDecimal("100.00"));
        saga.transicionarPara(SagaState.VALIDADO); // saga ja passou desse ponto
        when(sagaRepository.findById(saga.getId())).thenReturn(Optional.of(saga));

        BoletoValidadoEvent eventoAtrasado = BoletoValidadoEvent.sucesso(saga.getId(), "Fulano LTDA", LocalDate.now().plusDays(3));
        orchestrator.aoValidarBoleto(eventoAtrasado, channel, 1L);

        assertEquals(SagaState.VALIDADO, saga.getEstado()); // nao regrediu nem reprocessou
        verify(sagaRepository, never()).save(any());
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), (Object) any());
        verify(channel).basicAck(1L, false); // mas confirma a entrega, e nao vira reentrega infinita
    }

    // DECISAO: este teste e a prova formal do fix "saga==null vai pra DLQ,
    // nao some com so um log" (ver CONCEITOS.md).
    @Test
    void sagaInexistenteCaiNoNackEmVezDeSerIgnoradaSilenciosamente() throws IOException {
        UUID sagaIdInexistente = UUID.randomUUID();
        when(sagaRepository.findById(sagaIdInexistente)).thenReturn(Optional.empty());

        BoletoValidadoEvent evento = BoletoValidadoEvent.sucesso(sagaIdInexistente, "Fulano LTDA", LocalDate.now().plusDays(3));
        orchestrator.aoValidarBoleto(evento, channel, 1L);

        verify(channel).basicNack(1L, false, false);
        verify(channel, never()).basicAck(anyLong(), anyBoolean());
    }

    // DECISAO: teste de regressao pro bug real da janela entre publish e o
    // segundo save (ver CONCEITOS.md) - garante que save() so roda UMA vez,
    // e ANTES do publish, nao depois.
    @Test
    void aoReservarSaldoComSucessoSalvaUmaUnicaVezAntesDePublicarLiquidacao() throws IOException {
        Saga saga = new Saga("chave-1", "34191790010104351004791020150008", new BigDecimal("100.00"));
        saga.transicionarPara(SagaState.VALIDADO);
        when(sagaRepository.findById(saga.getId())).thenReturn(Optional.of(saga));

        SaldoReservadoEvent evento = SaldoReservadoEvent.sucesso(saga.getId());
        orchestrator.aoReservarSaldo(evento, channel, 1L);

        assertEquals(SagaState.LIQUIDACAO_ENVIADA, saga.getEstado());
        verify(sagaRepository, times(1)).save(saga);

        InOrder ordem = inOrder(sagaRepository, rabbitTemplate);
        ordem.verify(sagaRepository).save(saga);
        ordem.verify(rabbitTemplate).convertAndSend(eq(SagaMessagingConfig.EXCHANGE),
                eq(SagaMessagingConfig.CMD_ENVIAR_LIQUIDACAO), (Object) any());
    }

    // DECISAO: prova formal de que o historico ganha as DUAS linhas
    // (SALDO_RESERVADO e LIQUIDACAO_ENVIADA) mesmo com um unico save da saga -
    // exatamente a separacao salvarComHistorico/registrarTransicao
    // documentada no CONCEITOS.md, pra nao reabrir a janela de corrida do
    // bug save-antes-do-publish.
    @Test
    void aoReservarSaldoComSucessoRegistraAsDuasTransicoesNoHistoricoComUmUnicoSaveDaSaga() throws IOException {
        Saga saga = new Saga("chave-1", "34191790010104351004791020150008", new BigDecimal("100.00"));
        saga.transicionarPara(SagaState.VALIDADO);
        when(sagaRepository.findById(saga.getId())).thenReturn(Optional.of(saga));

        SaldoReservadoEvent evento = SaldoReservadoEvent.sucesso(saga.getId());
        orchestrator.aoReservarSaldo(evento, channel, 1L);

        verify(sagaRepository, times(1)).save(saga);

        ArgumentCaptor<SagaTransicao> captor = ArgumentCaptor.forClass(SagaTransicao.class);
        verify(sagaTransicaoRepository, times(2)).save(captor.capture());

        List<SagaState> estadosRegistrados = captor.getAllValues().stream().map(SagaTransicao::getEstado).toList();
        assertEquals(List.of(SagaState.SALDO_RESERVADO, SagaState.LIQUIDACAO_ENVIADA), estadosRegistrados);
    }
}
