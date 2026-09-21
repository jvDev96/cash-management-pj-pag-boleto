import type { ResultadoValidacao } from "../validation/boletoValidator";
import { TAMANHO_MINIMO_LINHA_DIGITAVEL, TAMANHO_MAXIMO_LINHA_DIGITAVEL } from "../validation/boletoValidator";

type BoletoInputProps = {
  linhaDigitavel: string;
  aoAlterar: (valor: string) => void;
  resultado: ResultadoValidacao;
};

export function BoletoInput({ linhaDigitavel, aoAlterar, resultado }: BoletoInputProps) {
  const exibirErro =
    linhaDigitavel.length >= TAMANHO_MINIMO_LINHA_DIGITAVEL - 1 && !resultado.valido;

  return (
    <div>
      <label htmlFor="linha-digitavel">Linha digitável</label>
      <input
        id="linha-digitavel"
        type="text"
        inputMode="numeric"
        maxLength={TAMANHO_MAXIMO_LINHA_DIGITAVEL}
        value={linhaDigitavel}
        onChange={(e) => aoAlterar(e.target.value)}
        aria-invalid={exibirErro}
      />
      {exibirErro && <p role="alert">Linha digitável inválida.</p>}
    </div>
  );
}