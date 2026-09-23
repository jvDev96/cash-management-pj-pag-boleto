package com.itau.boletosaga;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class BoletoSagaBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BoletoSagaBackendApplication.class, args);
	}

}
