package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.itau.boletosaga.saga.Saga;
import com.itau.boletosaga.saga.SagaRepository;
import com.itau.boletosaga.saga.SagaState;

// DECISAO: consulta de boleto (RF03) e sincrona, sem passar pelo RabbitMQ.
// PORQUE: e uma leitura, nao uma acao que muda estado - nao precisa da
// garantia de mensageria assincrona que o pagamento em si precisa. O cliente
// precisa da resposta na hora pra montar a tela de revisao.
@Service
public class ConsultaBoletoService {

    private static final Map<String, String> BANCOS = Map.of(
            "001", "Banco do Brasil",
            "033", "Santander",
            "104", "Caixa Economica Federal",
            "237", "Bradesco",
            "341", "Itau Unibanco",
            "260", "Nubank"
    );

    private final SagaRepository sagaRepository;

    public ConsultaBoletoService(SagaRepository sagaRepository) {
        this.sagaRepository = sagaRepository;
    }

    public BoletoPreviewResponse consultar(String linhaDigitavel) {
        if (linhaDigitavel.endsWith("0000")) {
            return BoletoPreviewResponse.naoEncontrado("Boleto nao encontrado");
        }

        String tipo = switch (linhaDigitavel.length()) {
            case 44 -> "Codigo de barras";
            case 47 -> "Boleto bancario";
            case 48 -> "Convenio/arrecadacao";
            default -> "Formato desconhecido";
        };

        String codigoBanco = linhaDigitavel.substring(0, 3);
        String banco = BANCOS.getOrDefault(codigoBanco, "Banco nao identificado");

        // DECISAO: checa duplicidade pelo mesmo numero de boleto (linhaDigitavel),
        // nao pela Idempotency-Key.
        // PORQUE: Idempotency-Key protege contra reenvio ACIDENTAL da MESMA
        // tentativa (mesma instancia do formulario) - mas nao impede o
        // usuario digitar de proposito, numa aba/tentativa nova (chave nova),
        // um boleto que JA foi pago ou que ja tem um pagamento em andamento.
        // Essa e uma regra de negocio diferente: "documento ja pago/em
        // processamento nao pode ser pago de novo", verificada pelo dado do
        // boleto em si, nao pelo mecanismo de idempotencia de requisicao.
        Optional<Saga> sagaExistente = sagaRepository.findFirstByLinhaDigitavelAndEstadoNotInOrderByCriadoEmDesc(
                linhaDigitavel, SagaState.ESTADOS_QUE_NAO_BLOQUEIAM_NOVO_PAGAMENTO);

        return BoletoPreviewResponse.encontrado(
                "Beneficiario Simulado LTDA",
                extrairValor(linhaDigitavel),
                LocalDate.now().plusDays(5),
                tipo,
                banco,
                sagaExistente.map(Saga::getId).orElse(null),
                sagaExistente.map(Saga::getEstado).orElse(null)
        );
    }

    // DECISAO: extrai o valor dos ultimos 10 digitos, dividido por 100.
    // PORQUE: e assim que o formato real de linha digitavel de boleto
    // bancario codifica o valor (em centavos) - mesma posicao do formato de
    // verdade, so que sem validar contra um registro real.
    private BigDecimal extrairValor(String linhaDigitavel) {
        String ultimosDigitos = linhaDigitavel.substring(linhaDigitavel.length() - 10);
        long centavos = Long.parseLong(ultimosDigitos);
        return BigDecimal.valueOf(centavos, 2);
    }
}
