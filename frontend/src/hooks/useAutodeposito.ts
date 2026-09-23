import { useState } from "react";
import { BASE_URL } from "../api/config";
import type { Saldo } from "./useSaldo";

export function useAutodeposito() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(false);
  const [saldoAtualizado, setSaldoAtualizado] = useState<Saldo | null>(null);

  const depositar = (valor: number) => {
    setEnviando(true);
    setErro(false);
    setSaldoAtualizado(null);

    fetch(`${BASE_URL}/cliente/depositar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("deposito rejeitado");
        }
        return res.json();
      })
      .then((dados: Saldo) => {
        setSaldoAtualizado(dados);
        setEnviando(false);
      })
      .catch(() => {
        setErro(true);
        setEnviando(false);
      });
  };

  return { depositar, enviando, erro, saldoAtualizado };
}
