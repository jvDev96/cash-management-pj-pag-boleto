import { useState } from "react";
import { BASE_URL } from "../api/config";

export type Saldo = {
  nome: string;
  saldoReal: number;
  saldoDisponivel: number;
};

// DECISAO: consultar() e disparado manualmente (onMouseEnter no Layout), nao
// automatico num useEffect ao montar.
// PORQUE: Layout monta uma unica vez e persiste entre paginas (envolve as
// Routes) - se buscasse so ao montar, o saldo ficaria desatualizado depois
// de um pagamento mudar ele de verdade. Buscar a cada hover mantem o valor
// exibido sempre fresco, sem precisar de polling constante em segundo plano.
export function useSaldo() {
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [carregando, setCarregando] = useState(false);

  const consultar = () => {
    setCarregando(true);
    fetch(`${BASE_URL}/cliente/saldo`)
      .then((res) => res.json())
      .then((dados: Saldo) => {
        setSaldo(dados);
        setCarregando(false);
      })
      .catch(() => {
        setCarregando(false);
      });
  };

  return { saldo, carregando, consultar };
}
