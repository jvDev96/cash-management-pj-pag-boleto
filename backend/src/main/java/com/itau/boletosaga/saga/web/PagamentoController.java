package com.itau.boletosaga.saga.web;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.itau.boletosaga.saga.SagaOrchestrator;
import com.itau.boletosaga.saga.SagaRepository;

@RestController
@RequestMapping("/pagamentos")
public class PagamentoController {

    private final SagaOrchestrator sagaOrchestrator;
    private final SagaRepository sagaRepository;

    public PagamentoController(SagaOrchestrator sagaOrchestrator, SagaRepository sagaRepository) {
        this.sagaOrchestrator = sagaOrchestrator;
        this.sagaRepository = sagaRepository;
    }

    // DECISAO: 202 (Accepted) quando cria de verdade, 200 (OK) quando so
    // devolve uma saga que ja existia (reenvio idempotente).
    // PORQUE: 202 comunica "aceitei, vou processar de forma assincrona" -
    // nao faz sentido usar o mesmo codigo pra "aceitei" e "ja tinha aceitado
    // antes", sao situacoes diferentes que o cliente pode querer distinguir.
    @PostMapping
    public ResponseEntity<PagamentoResponse> criar(@RequestHeader("Idempotency-Key") String idempotencyKey,
                                                     @RequestBody CriarPagamentoRequest request) {
        SagaOrchestrator.ResultadoIniciarSaga resultado = sagaOrchestrator.iniciar(
                idempotencyKey, request.linhaDigitavel(), request.valor());

        HttpStatus status = resultado.novaSaga() ? HttpStatus.ACCEPTED : HttpStatus.OK;
        return ResponseEntity.status(status).body(PagamentoResponse.de(resultado.saga()));
    }

    @GetMapping("/{sagaId}")
    public ResponseEntity<PagamentoResponse> consultarStatus(@PathVariable UUID sagaId) {
        return sagaRepository.findById(sagaId)
                .map(saga -> ResponseEntity.ok(PagamentoResponse.de(saga)))
                .orElse(ResponseEntity.notFound().build());
    }
}
