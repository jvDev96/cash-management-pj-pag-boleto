package com.itau.boletosaga.cliente;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClienteConfig {

    // DECISAO: um unico cliente demo, ID fixo e conhecido - nao ha tela de
    // login/cadastro nesse case, so um usuario PJ simulado (o mesmo exibido
    // no cabecalho do front).
    public static final UUID ID_CLIENTE_DEMO = UUID.fromString("11111111-1111-1111-1111-111111111111");

    // DECISAO: R$699,99, nao um numero redondo qualquer.
    // PORQUE: preserva a regra deterministica ja documentada e testada
    // (valor >= R$700 falha por saldo insuficiente) - so que agora e uma
    // consequencia REAL do saldo disponivel, nao mais uma constante solta
    // no listener. Ver DECISAO em ContaSaldoListener.
    static final BigDecimal SALDO_INICIAL_DEMO = new BigDecimal("699.99");

    @Bean
    ApplicationListener<ApplicationReadyEvent> seedClienteDemo(ClienteRepository clienteRepository) {
        return event -> {
            if (clienteRepository.findById(ID_CLIENTE_DEMO).isEmpty()) {
                clienteRepository.save(new Cliente(ID_CLIENTE_DEMO, "João Victor Pereira", SALDO_INICIAL_DEMO));
            }
        };
    }
}
