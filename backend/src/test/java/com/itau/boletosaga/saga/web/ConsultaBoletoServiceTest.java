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
