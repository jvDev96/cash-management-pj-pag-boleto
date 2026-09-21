package com.itau.boletosaga;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// DECISAO: @EnableScheduling aqui.
// PORQUE: sem essa anotação em algum lugar da configuração, métodos
// anotados com @Scheduled simplesmente nunca rodam - silenciosamente,
// sem erro nenhum, o que é uma pegadinha clássica de Spring Boot.
@EnableScheduling
@SpringBootApplication
public class BoletoSagaBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BoletoSagaBackendApplication.class, args);
	}

}
