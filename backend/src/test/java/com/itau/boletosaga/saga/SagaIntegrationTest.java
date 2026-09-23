package com.itau.boletosaga.saga;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.itau.boletosaga.cliente.Cliente;
import com.itau.boletosaga.cliente.ClienteConfig;
import com.itau.boletosaga.cliente.ClienteRepository;
import com.itau.boletosaga.cliente.ClienteSaldoResponse;
import com.itau.boletosaga.cliente.DepositoRequest;
import com.itau.boletosaga.saga.web.BoletoPreviewResponse;
import com.itau.boletosaga.saga.web.CriarPagamentoRequest;
import com.itau.boletosaga.saga.web.PagamentoResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

// DECISAO: unico teste de integracao do backend, propositalmente separado
// dos testes unitarios/Mockito ja existentes (SagaOrchestratorTest, etc).
// PORQUE: aqueles testam a LOGICA de decisao do orquestrador com o
// RabbitTemplate mockado - rapidos, isolados, nao provam que a fiacao real
// (filas declaradas de verdade, listeners de fato registrados, JSON
// serializando/desserializando pela rede) funciona. Este teste sobe
// Postgres+RabbitMQ REAIS via Testcontainers e sobe a aplicacao Spring
// INTEIRA - e o unico lugar do projeto que valida a integracao de ponta a
// ponta, do POST /pagamentos ate a saga chegar em estado terminal no banco.
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class SagaIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    @ServiceConnection
    static final RabbitMQContainer RABBIT = new RabbitMQContainer("rabbitmq:3-management-alpine");

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private SagaRepository sagaRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    // DECISAO: reseta o saldo do cliente demo a cada teste, batendo no
    // endpoint de reset em vez de manipular o repositorio direto.
    // PORQUE: e o mesmo endpoint feito pra repetibilidade de demonstracao
    // (ver DECISAO em ClienteController) - reusa-lo aqui garante que o
    // teste exercita o MESMO caminho de codigo que a demo ao vivo usa,
    // em vez de um atalho especifico so pra teste.
    @BeforeEach
    void resetarSaldoDoClienteDemo() {
        restTemplate.postForEntity("/cliente/resetar-saldo", null, Void.class);
    }

    @Test
    void fluxoCompletoDeSucessoConcluiEDebitaOSaldoReal() {
        String linhaDigitavel = "34191791234567890123456789012345678901234561"; // nao termina em "0000"
        BigDecimal valor = new BigDecimal("100.00"); // < 500 (liquidacao) e < 200.00 (saldo)

        UUID sagaId = criarPagamento(linhaDigitavel, valor, HttpStatus.ACCEPTED);

        Saga sagaFinal = aguardarEstadoTerminal(sagaId);

        assertEquals(SagaState.CONCLUIDO, sagaFinal.getEstado());
        assertNotNull(sagaFinal.getProtocolo());

        Cliente cliente = clienteRepository.findById(ClienteConfig.ID_CLIENTE_DEMO).orElseThrow();
        assertEquals(new BigDecimal("100.00"), cliente.getSaldoReal());
        assertEquals(new BigDecimal("100.00"), cliente.getSaldoDisponivel());
    }

    @Test
    void saldoInsuficienteRejeitaSemNuncaChegarAExecutarALiquidacao() {
        String linhaDigitavel = "34191791234567890123456789012345678901234562"; // nao termina em "0000"
        BigDecimal valor = new BigDecimal("700.00"); // >= saldo disponivel inicial (200.00)

        UUID sagaId = criarPagamento(linhaDigitavel, valor, HttpStatus.ACCEPTED);

        Saga sagaFinal = aguardarEstadoTerminal(sagaId);

        assertEquals(SagaState.REJEITADO, sagaFinal.getEstado());
        assertTrue(sagaFinal.getMotivoFalha().contains("Saldo insuficiente"));

        // DECISAO: confirma que o saldo NAO foi mexido - reserva que falhou
        // nunca deveria descontar nada (ver Cliente.reservar, que lanca ANTES
        // de subtrair).
        Cliente cliente = clienteRepository.findById(ClienteConfig.ID_CLIENTE_DEMO).orElseThrow();
        assertEquals(new BigDecimal("200.00"), cliente.getSaldoDisponivel());
    }

    @Test
    void boletoJaConcluidoApareceComoBloqueadoNaConsultaDePreview() {
        String linhaDigitavel = "34191791234567890123456789012345678901234563"; // nao termina em "0000"
        UUID sagaId = criarPagamento(linhaDigitavel, new BigDecimal("100.00"), HttpStatus.ACCEPTED);
        aguardarEstadoTerminal(sagaId);

        BoletoPreviewResponse preview = consultarPreview(linhaDigitavel);

        assertEquals(sagaId, preview.sagaExistente());
        assertEquals(SagaState.CONCLUIDO, preview.estadoSagaExistente());
    }

    @Test
    void boletoRejeitadoNaoBloqueiaUmaNovaTentativaDeMesmoNumero() {
        String linhaDigitavel = "34191791234567890123456789012345678901234564"; // nao termina em "0000"
        UUID sagaId = criarPagamento(linhaDigitavel, new BigDecimal("700.00"), HttpStatus.ACCEPTED); // saldo insuficiente -> REJEITADO
        aguardarEstadoTerminal(sagaId);

        BoletoPreviewResponse preview = consultarPreview(linhaDigitavel);

        // DECISAO: REJEITADO/FALHOU nao bloqueiam (SagaState.ESTADOS_QUE_NAO_BLOQUEIAM_NOVO_PAGAMENTO)
        // - documento que nunca chegou a pagar de verdade pode ser tentado de novo.
        assertNull(preview.sagaExistente());
    }

    @Test
    void depositoAumentaOSaldoEDestravaAReservaQueAntesSeriaRejeitadaPorSaldoInsuficiente() {
        HttpEntity<DepositoRequest> pedidoDeposito = new HttpEntity<>(new DepositoRequest(new BigDecimal("300.00")));
        ResponseEntity<ClienteSaldoResponse> respostaDeposito =
                restTemplate.postForEntity("/cliente/depositar", pedidoDeposito, ClienteSaldoResponse.class);

        assertEquals(HttpStatus.OK, respostaDeposito.getStatusCode());
        assertNotNull(respostaDeposito.getBody());
        assertEquals(new BigDecimal("500.00"), respostaDeposito.getBody().saldoDisponivel());
        assertEquals(new BigDecimal("500.00"), respostaDeposito.getBody().saldoReal());

        // DECISAO: valor 500 - sem o deposito, teria sido REJEITADO na reserva
        // (saldo insuficiente, saldo inicial 200.00, ja provado no outro
        // teste). Com o deposito, a reserva passa (500 <= 500.00) - mas o
        // valor tambem e >= 500, entao essa MESMA tentativa ainda falha
        // depois, na liquidacao (regra deterministica separada, nao
        // relacionada a saldo - ver LiquidacaoListener). O que este teste
        // prova e especificamente que o deposito destravou a reserva: o
        // estado final e FALHOU (passou pela reserva), nao REJEITADO (que
        // seria "nem chegou a reservar").
        String linhaDigitavel = "34191791234567890123456789012345678901234565";
        UUID sagaId = criarPagamento(linhaDigitavel, new BigDecimal("500.00"), HttpStatus.ACCEPTED);
        Saga sagaFinal = aguardarEstadoTerminal(sagaId);

        assertEquals(SagaState.FALHOU, sagaFinal.getEstado());

        // a compensacao devolveu a reserva pro disponivel - saldo volta pra
        // onde estava antes dessa tentativa (o real nunca foi confirmado).
        Cliente cliente = clienteRepository.findById(ClienteConfig.ID_CLIENTE_DEMO).orElseThrow();
        assertEquals(new BigDecimal("500.00"), cliente.getSaldoDisponivel());
        assertEquals(new BigDecimal("500.00"), cliente.getSaldoReal());
    }

    @Test
    void depositoDeValorZeroOuNegativoERejeitado() {
        HttpEntity<DepositoRequest> pedidoInvalido = new HttpEntity<>(new DepositoRequest(new BigDecimal("0.00")));
        ResponseEntity<ClienteSaldoResponse> resposta =
                restTemplate.postForEntity("/cliente/depositar", pedidoInvalido, ClienteSaldoResponse.class);

        assertEquals(HttpStatus.BAD_REQUEST, resposta.getStatusCode());

        Cliente cliente = clienteRepository.findById(ClienteConfig.ID_CLIENTE_DEMO).orElseThrow();
        assertEquals(new BigDecimal("200.00"), cliente.getSaldoDisponivel());
    }

    private BoletoPreviewResponse consultarPreview(String linhaDigitavel) {
        ResponseEntity<BoletoPreviewResponse> resposta =
                restTemplate.getForEntity("/boletos/{linha}", BoletoPreviewResponse.class, linhaDigitavel);
        assertEquals(HttpStatus.OK, resposta.getStatusCode());
        assertNotNull(resposta.getBody());
        return resposta.getBody();
    }

    private UUID criarPagamento(String linhaDigitavel, BigDecimal valor, HttpStatus statusEsperado) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Idempotency-Key", UUID.randomUUID().toString());
        HttpEntity<CriarPagamentoRequest> request =
                new HttpEntity<>(new CriarPagamentoRequest(linhaDigitavel, valor), headers);

        ResponseEntity<PagamentoResponse> resposta =
                restTemplate.postForEntity("/pagamentos", request, PagamentoResponse.class);

        assertEquals(statusEsperado, resposta.getStatusCode());
        assertNotNull(resposta.getBody());
        return resposta.getBody().sagaId();
    }

    // DECISAO: polling manual (sem Awaitility) contra o banco de verdade.
    // PORQUE: e a mesma tecnica que o front usa pra acompanhar status
    // (polling) - aqui, em vez de adicionar uma dependencia so pra isso,
    // um loop simples com timeout generoso (cobre 3x SimulacaoDelay de 3s
    // do fluxo feliz + latencia real de RabbitMQ) e suficiente.
    private Saga aguardarEstadoTerminal(UUID sagaId) {
        Instant limite = Instant.now().plus(Duration.ofSeconds(25));
        while (Instant.now().isBefore(limite)) {
            Saga saga = sagaRepository.findById(sagaId).orElseThrow();
            if (saga.getEstado() == SagaState.CONCLUIDO
                    || saga.getEstado() == SagaState.REJEITADO
                    || saga.getEstado() == SagaState.FALHOU) {
                return saga;
            }
            try {
                Thread.sleep(300);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                fail("Interrompido esperando estado terminal");
            }
        }
        return fail("Saga " + sagaId + " nao chegou a um estado terminal a tempo");
    }
}
