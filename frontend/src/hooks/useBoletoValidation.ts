import { useState } from "react";
import { TAMANHO_MAXIMO_LINHA_DIGITAVEL, validarLinhaDigitavel } from "../validation/boletoValidator";

export function useBoletoValidation() {
  const [linhaDigitavel, setLinhaDigitavel] = useState("");

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
