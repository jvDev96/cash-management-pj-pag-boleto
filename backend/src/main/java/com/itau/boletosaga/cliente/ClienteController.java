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

    @PostMapping("/resetar-saldo")
    public ClienteSaldoResponse resetarSaldo() {
        Cliente cliente = buscarClienteDemo();
        cliente.resetarSaldo(ClienteConfig.SALDO_INICIAL_DEMO);
        clienteRepository.save(cliente);
        return ClienteSaldoResponse.de(cliente);
    }

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
