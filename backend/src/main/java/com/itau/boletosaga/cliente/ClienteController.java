package com.itau.boletosaga.cliente;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cliente")
public class ClienteController {

    private final ClienteRepository clienteRepository;

    public ClienteController(ClienteRepository clienteRepository) {
        this.clienteRepository = clienteRepository;
    }

    @GetMapping("/saldo")
    public ClienteSaldoResponse consultarSaldo() {
        return ClienteSaldoResponse.de(buscarClienteDemo());
    }

    // DECISAO: endpoint de reset existe so pra demonstracao repetivel.
    // PORQUE: saldo agora persiste de verdade entre pagamentos (RabbitMQ +
    // Postgres, nao reseta ao reiniciar o front) - sem isso, gravar o video
    // de demo duas vezes ou repetir na entrevista ao vivo exigiria reiniciar
    // o banco inteiro. Mesmo espirito do SimulacaoDelay: existe so por causa
    // da demonstracao, nao estaria numa API real de producao (reset de saldo
    // de cliente nunca seria uma acao exposta livremente).
    @PostMapping("/resetar-saldo")
    public ClienteSaldoResponse resetarSaldo() {
        Cliente cliente = buscarClienteDemo();
        cliente.resetarSaldo(ClienteConfig.SALDO_INICIAL_DEMO);
        clienteRepository.save(cliente);
        return ClienteSaldoResponse.de(cliente);
    }

    // DECISAO: "Autodeposito" - endpoint de demonstracao pra colocar saldo
    // na conta do cliente demo.
    // PORQUE: pagamentos consomem saldo de verdade agora (ver ContaSaldoListener/
    // LiquidacaoListener) - sem um jeito de repor, o saldo demo (R$699,99)
    // se esgota depois de poucos pagamentos bem-sucedidos e a demonstracao
    // trava. Numa aplicacao real isso seria uma transferencia/PIX recebido,
    // nao um endpoint que qualquer um chama - existe aqui so pelo mesmo
    // motivo do reset de saldo: repetibilidade de demo.
    @PostMapping("/depositar")
    public ResponseEntity<ClienteSaldoResponse> depositar(@RequestBody DepositoRequest request) {
        if (request.valor() == null) {
            return ResponseEntity.badRequest().build();
        }
        Cliente cliente = buscarClienteDemo();
        try {
            cliente.depositar(request.valor());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        clienteRepository.save(cliente);
        return ResponseEntity.ok(ClienteSaldoResponse.de(cliente));
    }

    private Cliente buscarClienteDemo() {
        return clienteRepository.findById(ClienteConfig.ID_CLIENTE_DEMO)
                .orElseThrow(() -> new IllegalStateException("Cliente demo nao foi inicializado"));
    }
}
