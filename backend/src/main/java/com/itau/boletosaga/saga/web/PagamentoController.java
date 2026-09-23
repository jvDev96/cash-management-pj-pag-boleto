package com.itau.boletosaga.saga.web;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.itau.boletosaga.saga.Saga;
import com.itau.boletosaga.saga.SagaOrchestrator;
import com.itau.boletosaga.saga.SagaRepository;
import com.itau.boletosaga.saga.SagaTransicao;
import com.itau.boletosaga.saga.SagaTransicaoRepository;

@RestController
@RequestMapping("/pagamentos")
public class PagamentoController {

    private final SagaOrchestrator sagaOrchestrator;
    private final SagaRepository sagaRepository;
    private final SagaTransicaoRepository sagaTransicaoRepository;

    public PagamentoController(SagaOrchestrator sagaOrchestrator, SagaRepository sagaRepository,
                                SagaTransicaoRepository sagaTransicaoRepository) {
        this.sagaOrchestrator = sagaOrchestrator;
        this.sagaRepository = sagaRepository;
        this.sagaTransicaoRepository = sagaTransicaoRepository;
    }

    @PostMapping
    public ResponseEntity<PagamentoResponse> criar(@RequestHeader("Idempotency-Key") String idempotencyKey,
                                                     @RequestBody CriarPagamentoRequest request) {
        SagaOrchestrator.ResultadoIniciarSaga resultado = sagaOrchestrator.iniciar(
                idempotencyKey, request.linhaDigitavel(), request.valor());

        HttpStatus status = resultado.novaSaga() ? HttpStatus.ACCEPTED : HttpStatus.OK;
        return ResponseEntity.status(status).body(montarResposta(resultado.saga()));
    }

    @GetMapping
    public Page<PagamentoResumoResponse> listar(
            @PageableDefault(size = 10, sort = "atualizadoEm", direction = Sort.Direction.DESC) Pageable pageable) {
        return sagaRepository.findAll(pageable).map(PagamentoResumoResponse::de);
    }

    @GetMapping("/{sagaId}")
    public ResponseEntity<PagamentoResponse> consultarStatus(@PathVariable UUID sagaId) {
        return sagaRepository.findById(sagaId)
                .map(saga -> ResponseEntity.ok(montarResposta(saga)))
                .orElse(ResponseEntity.notFound().build());
    }

    private PagamentoResponse montarResposta(Saga saga) {
        List<SagaTransicao> historico = sagaTransicaoRepository.findBySagaIdOrderByTimestampAsc(saga.getId());
        return PagamentoResponse.de(saga, historico);
    }
}
