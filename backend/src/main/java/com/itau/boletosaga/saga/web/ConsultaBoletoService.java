package com.itau.boletosaga.saga.web;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import org.springframework.stereotype.Service;

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

        return BoletoPreviewResponse.encontrado(
                "Beneficiario Simulado LTDA",
                extrairValor(linhaDigitavel),
                LocalDate.now().plusDays(5),
                tipo,
                banco
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
