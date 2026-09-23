import type { MotivoInvalido, ResultadoValidacao } from "../validation/boletoValidator";
import {
  TAMANHO_MINIMO_LINHA_DIGITAVEL,
  TAMANHO_MAXIMO_LINHA_DIGITAVEL,
  TAMANHO_MAXIMO_FORMATO_VALIDO,
  mascararLinhaDigitavel,
  extrairValorLocal,
  rotuloTipo,
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

  // DECISAO: previa local inteira (banco, tipo, valor) e derivada so do
  // dado ja digitado, sem nenhuma chamada de rede - nao espera nem a linha
  // estar completa, nem o DV estar correto, nem o GET de preview responder.
  // PORQUE: banco/tipo/valor sao propriedades ESTRUTURAIS da linha
  // digitavel (posicao fixa por formato, especificacao FEBRABAN) - dado que
  // o proprio navegador ja tem em maos, nao precisa perguntar pro backend.
  // So o beneficiario fica de fora dessa previa: e dado simulado que so o
  // backend "conhece", nao esta codificado na linha de forma nenhuma.
  const bancoDetectado = detectarBanco(linhaDigitavel);
  const tipoDetectado = rotuloTipo(resultado.formato);
  const valorDetectado = extrairValorLocal(linhaDigitavel, resultado.formato);
  const temPreviaLocal = bancoDetectado !== null || tipoDetectado !== null;

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
      {temPreviaLocal && (
        <dl className={styles.previaLocal}>
          {tipoDetectado && (
            <>
              <dt>Tipo</dt>
              <dd>{tipoDetectado}</dd>
            </>
          )}
          <dt>Banco</dt>
          <dd>{bancoDetectado ?? "Não identificado"}</dd>
          {valorDetectado !== null && (
            <>
              <dt>Valor</dt>
              <dd>{formatarValor(valorDetectado)}</dd>
            </>
          )}
        </dl>
      )}
      {exibirErro && (
        <p role="alert" className={styles.mensagemErro}>
          Linha digitável inválida. {mensagemErro}
        </p>
      )}
    </div>
  );
}

function formatarValor(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}
