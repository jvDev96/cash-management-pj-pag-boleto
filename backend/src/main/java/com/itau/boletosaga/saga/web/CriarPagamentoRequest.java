package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;

public record CriarPagamentoRequest(String linhaDigitavel, BigDecimal valor) {
}
