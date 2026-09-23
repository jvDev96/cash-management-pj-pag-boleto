import { useState } from "react";
import { TAMANHO_MAXIMO_LINHA_DIGITAVEL, validarLinhaDigitavel } from "../validation/boletoValidator";

export function useBoletoValidation() {
  const [linhaDigitavel, setLinhaDigitavel] = useState("");

  // DECISAO: sanitizacao (remover pontuacao) acontece aqui, no setter, unica borda de entrada.
  // PORQUE: garante que o estado interno do hook - e tudo que consome ele depois -
  // sempre trabalha com digito puro, sem repetir a limpeza em cada consumidor.
  // DECISAO: truncado em TAMANHO_MAXIMO_LINHA_DIGITAVEL aqui, nao so no maxLength do input.
  // PORQUE: agora o <input> exibe o valor MASCARADO (com pontos/espacos), entao o
  // maxLength nativo do DOM contaria caractere de mascara, nao digito - o limite de
  // verdade precisa ser garantido no dado, nao na apresentacao.
  const alterarLinhaDigitavel = (valorBruto: string) => {
    const somenteDigitos = valorBruto.replace(/\D/g, "").slice(0, TAMANHO_MAXIMO_LINHA_DIGITAVEL);
    setLinhaDigitavel(somenteDigitos);
  };

  const resultado = validarLinhaDigitavel(linhaDigitavel);

  const limpar = () => {
    setLinhaDigitavel("");
  };

  return { linhaDigitavel, alterarLinhaDigitavel, resultado, limpar };
}
