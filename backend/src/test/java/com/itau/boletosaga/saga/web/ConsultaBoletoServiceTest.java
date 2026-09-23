package com.itau.boletosaga.saga.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.itau.boletosaga.saga.SagaRepository;
import com.itau.boletosaga.saga.SagaState;

class ConsultaBoletoServiceTest {

    private final SagaRepository sagaRepository = mock(SagaRepository.class);
    private final ConsultaBoletoService service = new ConsultaBoletoService(sagaRepository);

    // DECISAO: bug real, relatado ao vivo com um numero de teste - o valor
    // exibido no preview local (front) batia (R$3.259,26), mas o backend
    // devolvia R$35.555.555,35 pro MESMO numero. Esse teste prova a posicao
    // certa pro codigo de barras (44 digitos): valor nas posicoes 9-19, nao
    // "ultimos 10 digitos" (que pertencem ao campo livre nesse formato).
    @Test
    void extraiValorDaPosicaoCertaParaCodigoDeBarras() {
        semSagaExistente();
        String linha = "26093913500003259260000000000000033555555535"; // 44 digitos
        BoletoPreviewResponse resposta = service.consultar(linha);

        assertEquals(new BigDecimal("3259.26"), resposta.valor());
    }

    @Test
    void extraiValorDosUltimos10DigitosParaBoletoBancario() {
        semSagaExistente();
        String linha = "3".repeat(37) + "0000015000"; // 47 digitos, nao termina em "0000"
        BoletoPreviewResponse resposta = service.consultar(linha);

        assertEquals(new BigDecimal("150.00"), resposta.valor());
    }

    @Test
    void extraiValorDoConvenioReconstruindoOsBlocosDe11() {
        semSagaExistente();
        // mesma linha usada nos testes de mod11.ts/boletoValidator.ts do front:
        // identificador (posicao 3) = "8" -> valor efetivo em reais
        String linha = "818530741850296307418526963074185298630741852969"; // 48 digitos
        BoletoPreviewResponse resposta = service.consultar(linha);

        assertEquals(new BigDecimal("307418529.63"), resposta.valor());
    }

    @Test
    void identificadorDeQuantidadeReferenciaNoConvenioNaoRetornaValorDireto() {
        semSagaExistente();
        // mesma linha acima, trocando so o identificador (posicao 3) pra "9"
        // (quantidade/referencia) - nao e um valor monetario direto
        String linha = "81" + "9" + "530741850296307418526963074185298630741852969";
        BoletoPreviewResponse resposta = service.consultar(linha);

        assertEquals(BigDecimal.ZERO.setScale(2), resposta.valor());
    }

    private void semSagaExistente() {
        when(sagaRepository.findFirstByLinhaDigitavelAndEstadoNotInOrderByCriadoEmDesc(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(Optional.empty());
    }

    @Test
    void naoEncontradoQuandoTerminaEm0000() {
        BoletoPreviewResponse resposta = service.consultar("1".repeat(43) + "0000");

        assertEquals(false, resposta.encontrado());
        assertNull(resposta.valor());
    }
}
