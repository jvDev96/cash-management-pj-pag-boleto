package com.itau.boletosaga.saga.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // DECISAO: libera explicitamente so a origem do Vite em desenvolvimento
    // (localhost:5173), nao um wildcard "*".
    // PORQUE: front e back sao servicos separados por decisao arquitetural desde
    // o inicio do projeto (nao um monolito) - CORS precisa existir de verdade,
    // com allowlist explicita, nao so silenciado com "*" pra fazer funcionar.
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST")
                .allowedHeaders("*");
    }
}
