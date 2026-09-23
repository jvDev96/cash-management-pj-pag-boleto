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
        // DECISAO: valida que os campos numericos vieram de verdade antes
        // de aceitar a resposta, nao confia soh no status HTTP 200.
        // PORQUE: e a causa raiz de um bug real que vimos ao vivo - back
        // desatualizado/endpoint errado pode devolver 200 com um corpo sem
        // os campos esperados, e Intl.NumberFormat().format(undefined)
        // formata silenciosamente como "R$ NaN" em vez de avisar de erro.
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
