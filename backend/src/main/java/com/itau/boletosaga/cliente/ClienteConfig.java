package com.itau.boletosaga.cliente;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClienteConfig {

    public static final UUID ID_CLIENTE_DEMO = UUID.fromString("11111111-1111-1111-1111-111111111111");

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
