import { useState } from "react";
import { useAutodeposito } from "../hooks/useAutodeposito";
import styles from "./AutodepositoPage.module.scss";

// DECISAO: renderizada dentro da HomePage (?view=autodeposito), nao rota
// propria - por isso sem botao de voltar: os 3 cards continuam visiveis
// acima, trocar de visao e so clicar em outro card.
export function AutodepositoPage() {
  const [valorDigitado, setValorDigitado] = useState("");
  const { depositar, enviando, erro, saldoAtualizado } = useAutodeposito();

  const valorNumerico = Number(valorDigitado.replace(",", "."));
  const valorValido = valorDigitado.trim() !== "" && valorNumerico > 0;

  return (
    <div className={styles.pagina}>
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
