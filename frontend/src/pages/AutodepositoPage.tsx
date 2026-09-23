import { useState } from "react";
import { useAutodeposito } from "../hooks/useAutodeposito";
import { BotaoVoltar } from "../components/BotaoVoltar";
import styles from "./AutodepositoPage.module.scss";

// DECISAO: pagina propria (nao modal), mesmo sendo "telinha simples".
// PORQUE: mesmo padrao das outras 2 telas (Pagar Boleto, Historico) -
// acessivel por link direto, com BotaoVoltar, sem estado escondido atras de
// um componente que so existe dentro de outra pagina.
export function AutodepositoPage() {
  const [valorDigitado, setValorDigitado] = useState("");
  const { depositar, enviando, erro, saldoAtualizado } = useAutodeposito();

  const valorNumerico = Number(valorDigitado.replace(",", "."));
  const valorValido = valorDigitado.trim() !== "" && valorNumerico > 0;

  return (
    <div className={styles.pagina}>
      <BotaoVoltar />
      <h1 className={styles.titulo}>Autodepósito</h1>
      <p className={styles.subtitulo}>Adicione saldo à sua conta para testar pagamentos</p>

      <form
        className={styles.card}
        onSubmit={(e) => {
          e.preventDefault();
          if (valorValido) {
            depositar(valorNumerico);
          }
        }}
      >
        <label htmlFor="valor-deposito" className={styles.label}>
          Valor (R$)
        </label>
        <input
          id="valor-deposito"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={valorDigitado}
          onChange={(e) => setValorDigitado(e.target.value)}
          className={styles.input}
        />
        <button type="submit" className={styles.botao} disabled={!valorValido || enviando}>
          Depositar
        </button>
      </form>

      {erro && (
        <p role="alert" className={styles.erro}>
          Não foi possível concluir o depósito. Verifique o valor e tente novamente.
        </p>
      )}

      {saldoAtualizado && (
        <p role="status" className={styles.sucesso}>
          Depósito concluído! Saldo disponível agora: {formatarValor(saldoAtualizado.saldoDisponivel)}
        </p>
      )}
    </div>
  );
}

function formatarValor(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}
