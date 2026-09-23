import { useState } from "react";
import { useAutodeposito } from "../hooks/useAutodeposito";
import styles from "./AutodepositoPage.module.scss";

const LIMITE_DIGITOS_CENTAVOS = 12; // margem de seguranca - alem disso e claramente lixo de digitacao

export function AutodepositoPage() {
  const [digitosCentavos, setDigitosCentavos] = useState("");
  const { depositar, enviando, erro, saldoAtualizado } = useAutodeposito();

  const valorNumerico = digitosCentavos === "" ? 0 : Number(digitosCentavos) / 100;
  const valorValido = valorNumerico > 0;

  const aoAlterarValor = (bruto: string) => {
    const somenteDigitos = bruto.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    setDigitosCentavos(somenteDigitos.slice(0, LIMITE_DIGITOS_CENTAVOS));
  };

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
          inputMode="numeric"
          placeholder="0,00"
          value={formatarCentavos(digitosCentavos)}
          onChange={(e) => aoAlterarValor(e.target.value)}
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

function formatarCentavos(digitosCentavos: string): string {
  const centavos = digitosCentavos === "" ? 0 : Number(digitosCentavos);
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    centavos / 100
  );
}

function formatarValor(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}
