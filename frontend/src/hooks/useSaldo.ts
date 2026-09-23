import { useState } from "react";
import { BASE_URL } from "../api/config";

export type Saldo = {
  nome: string;
  saldoReal: number;
  saldoDisponivel: number;
};

export function useSaldo() {
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  const consultar = () => {
    setCarregando(true);
    setErro(false);
    fetch(`${BASE_URL}/cliente/saldo`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("resposta nao-OK");
        }
        return res.json();
      })
      .then((dados: Saldo) => {
        if (typeof dados.saldoDisponivel !== "number" || typeof dados.saldoReal !== "number") {
          throw new Error("formato de resposta inesperado");
        }
        setSaldo(dados);
        setCarregando(false);
      })
      .catch(() => {
        setErro(true);
        setCarregando(false);
      });
  };

  return { saldo, carregando, erro, consultar };
}
