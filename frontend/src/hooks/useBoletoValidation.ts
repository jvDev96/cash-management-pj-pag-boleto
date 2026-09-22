import { useState } from "react";
import { validarLinhaDigitavel } from "../validation/boletoValidator";

export function useBoletoValidation() {
  const [linhaDigitavel, setLinhaDigitavel] = useState("");

  // DECISAO: sanitizacao (remover pontuacao) acontece aqui, no setter, unica borda de entrada.
  // PORQUE: garante que o estado interno do hook - e tudo que consome ele depois -
  // sempre trabalha com digito puro, sem repetir a limpeza em cada consumidor.
  const alterarLinhaDigitavel = (valorBruto: string) => {
    const somenteDigitos = valorBruto.replace(/\D/g, "");
    setLinhaDigitavel(somenteDigitos);
  };

  const resultado = validarLinhaDigitavel(linhaDigitavel);

  const limpar = () => {
    setLinhaDigitavel("");
  };

  return { linhaDigitavel, alterarLinhaDigitavel, resultado, limpar };
}
