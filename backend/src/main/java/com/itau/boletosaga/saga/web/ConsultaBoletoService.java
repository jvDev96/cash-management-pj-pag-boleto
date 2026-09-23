package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.itau.boletosaga.saga.Saga;
import com.itau.boletosaga.saga.SagaRepository;
import com.itau.boletosaga.saga.SagaState;

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

    private BigDecimal extrairValor(String linhaDigitavel) {
        String digitosValor = switch (linhaDigitavel.length()) {
            case 44 -> linhaDigitavel.substring(9, 19); // codigo de barras
            case 47 -> linhaDigitavel.substring(37, 47); // boleto bancario (Campo5)
            case 48 -> extrairDigitosValorConvenio(linhaDigitavel);
            default -> linhaDigitavel.substring(linhaDigitavel.length() - 10);
        };
        long centavos = Long.parseLong(digitosValor);
        return BigDecimal.valueOf(centavos, 2);
    }

    private String extrairDigitosValorConvenio(String linhaDigitavel) {
        String codigoBarras = reconstruirCodigoBarrasConvenio(linhaDigitavel);
        char identificador = codigoBarras.charAt(2);
        if (identificador != '6' && identificador != '8') {
            // "7"/"9" = quantidade de moeda ou valor de referencia a
            // reajustar, nao um valor monetario direto
            return "00000000000";
        }
        return codigoBarras.substring(4, 15);
    }

    private String reconstruirCodigoBarrasConvenio(String linhaDigitavel) {
        StringBuilder codigoBarras = new StringBuilder();
        for (int b = 0; b < 4; b++) {
            codigoBarras.append(linhaDigitavel, b * 12, b * 12 + 11);
        }
        return codigoBarras.toString();
    }
}
