package com.itau.boletosaga.saga.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/boletos")
public class BoletoController {

    private final ConsultaBoletoService consultaBoletoService;

    public BoletoController(ConsultaBoletoService consultaBoletoService) {
        this.consultaBoletoService = consultaBoletoService;
    }

    @GetMapping("/{linhaDigitavel}")
    public ResponseEntity<BoletoPreviewResponse> consultar(@PathVariable String linhaDigitavel) {
        BoletoPreviewResponse resposta = consultaBoletoService.consultar(linhaDigitavel);
        HttpStatus status = resposta.encontrado() ? HttpStatus.OK : HttpStatus.NOT_FOUND;
        return ResponseEntity.status(status).body(resposta);
    }
}
