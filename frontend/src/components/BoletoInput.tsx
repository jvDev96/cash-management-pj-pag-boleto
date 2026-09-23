import type { MotivoInvalido, ResultadoValidacao } from "../validation/boletoValidator";
import {
  TAMANHO_MINIMO_LINHA_DIGITAVEL,
  TAMANHO_MAXIMO_LINHA_DIGITAVEL,
  TAMANHO_MAXIMO_FORMATO_VALIDO,
  mascararLinhaDigitavel,
} from "../validation/boletoValidator";
import { detectarBanco } from "../validation/bancos";
import styles from "./BoletoInput.module.scss";

type BoletoInputProps = {
  linhaDigitavel: string;
  aoAlterar: (valor: string) => void;
  resultado: ResultadoValidacao;
};

const MENSAGENS_POR_MOTIVO: Record<Exclude<MotivoInvalido, null>, string> = {
  TAMANHO_INVALIDO: "A linha digitável precisa ter 44, 47 ou 48 dígitos.",
  DV_BLOCO_1_INVALIDO: "Dígito verificador do 1º bloco (posições 1-10) não confere. Verifique esse trecho e tente novamente.",
  DV_BLOCO_2_INVALIDO: "Dígito verificador do 2º bloco (posições 11-21) não confere. Verifique esse trecho e tente novamente.",
  DV_BLOCO_3_INVALIDO: "Dígito verificador do 3º bloco (posições 22-32) não confere. Verifique esse trecho e tente novamente.",
  DV_GERAL_INVALIDO: "Dígito verificador geral não confere — pode ser erro de digitação em qualquer parte do número. Confira e tente novamente.",
};


export function BoletoInput({ linhaDigitavel, aoAlterar, resultado }: BoletoInputProps) {
  const exibirErro =
    linhaDigitavel.length >= TAMANHO_MINIMO_LINHA_DIGITAVEL - 1 && !resultado.valido;

  // DECISAO: resultado.motivo e nullable (MotivoInvalido inclui null), mas
  // MENSAGENS_POR_MOTIVO so tem chave pros motivos de erro de verdade -
  // precisa da guarda antes de indexar o mapa, senao o TypeScript reclama.
  const mensagemErro = resultado?.motivo ? MENSAGENS_POR_MOTIVO[resultado.motivo] : "";

  // DECISAO: banco e detectado so pelos 3 primeiros digitos, independente do
  // resto estar valido ainda.
  // PORQUE: e uma leitura estrutural (posicao fixa em qualquer formato), nao
  // depende do DV - da feedback visual reativo (qual banco) antes mesmo da
  // linha estar completa/valida, sem esperar o GET de preview.
  const bancoDetectado = detectarBanco(linhaDigitavel);

  // DECISAO: input controlado exibe o valor MASCARADO, mas o onChange extrai
  // digito puro do que veio do DOM antes de repassar pro hook.
  // PORQUE: mascara e so apresentacao - o dado que trafega (estado, validacao,
  // request) sempre foi e continua sendo digito puro (useBoletoValidation ja
  // sanitiza de novo por conta propria, e essa dupla sanitizacao e barata e
  // inofensiva). LIMITACAO CONHECIDA: como o valor exibido muda de tamanho a
  // cada tecla (mascara inserindo "." e " "), o cursor pula pro fim do campo
  // a cada digitacao - aceitavel porque o padrao de uso real e digitar/colar
  // sequencialmente do inicio ao fim, raramente editar no meio.
  return (
    <div className={styles.container}>
      <div className={styles.linhaLabel}>
        <label htmlFor="linha-digitavel" className={styles.label}>
          Linha digitável
        </label>
        <span className={styles.contador}>
          {linhaDigitavel.length}/{TAMANHO_MAXIMO_FORMATO_VALIDO}
        </span>
      </div>
      <input
        id="linha-digitavel"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={TAMANHO_MAXIMO_LINHA_DIGITAVEL + 10}
        value={mascararLinhaDigitavel(linhaDigitavel)}
        onChange={(e) => aoAlterar(e.target.value)}
        aria-invalid={exibirErro}
        className={exibirErro ? `${styles.input} ${styles.inputComErro}` : styles.input}
      />
      {bancoDetectado && (
        <p className={styles.bancoDetectado}>Banco: {bancoDetectado}</p>
      )}
      {exibirErro && (
        <p role="alert" className={styles.mensagemErro}>
          Linha digitável inválida. {mensagemErro}
        </p>
      )}
    </div>
  );
}
