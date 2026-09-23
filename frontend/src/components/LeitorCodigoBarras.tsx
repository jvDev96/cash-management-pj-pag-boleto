import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";
import styles from "./LeitorCodigoBarras.module.scss";

type LeitorCodigoBarrasProps = {
  aoLer: (codigoDeBarras: string) => void;
  aoFechar: () => void;
};

// DECISAO: aceita ITF (o simbolo real do codigo de barras de boleto) E
// QR_CODE, nao so ITF.
// PORQUE: ITF e o formato 1D mais dificil de decodificar via webcam (barras
// finas, sem separador visual, muito sensivel a foco/angulo/resolucao) -
// limitacao conhecida de leitores em JS, nao um bug especifico daqui. QR
// entra como alternativa PRATICA: da pra gerar um QR code com os mesmos
// digitos e testar/demonstrar a leitura de forma confiavel, sem depender de
// imprimir um boleto de verdade em papel numa distancia/angulo perfeitos.
const HINTS = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.ITF, BarcodeFormat.QR_CODE]]]);

// DECISAO: componente separado, ativado por botao explicito - nunca abre a
// camera sozinho.
// PORQUE: acesso a camera exige permissao do navegador (pode ser negada,
// pode nao existir camera) e so funciona com HTTPS/localhost - e um metodo
// de entrada ADICIONAL ao campo de texto, nunca uma dependencia. Digitar/
// colar continua sendo o caminho principal e mais confiavel.
const TAMANHOS_ACEITOS = [44, 47, 48]; // codigo de barras, boleto bancario, convenio

export function LeitorCodigoBarras({ aoLer, aoFechar }: LeitorCodigoBarrasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  // DECISAO: contador de tentativas exibido na tela, nao so log de console.
  // PORQUE: sem isso, "nao encontrou ainda" e indistinguivel de "trava/nao
  // esta fazendo nada" pra quem esta testando - feedback visual confirma que
  // o loop de leitura esta rodando de verdade.
  const [tentativas, setTentativas] = useState(0);

  useEffect(() => {
    let ativo = true;
    let controls: IScannerControls | undefined;
    const leitor = new BrowserMultiFormatReader(HINTS);

    leitor
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current ?? undefined,
        (resultado, erroLeitura, controlesAtuais) => {
          controls = controlesAtuais;
          if (!ativo || !resultado) {
            // DECISAO: NotFoundException dispara a cada frame SEM codigo
            // visivel - e o caso normal enquanto o usuario aponta a camera,
            // nao um erro de verdade. So preocupa se for outra excecao.
            if (erroLeitura && !(erroLeitura instanceof NotFoundException)) {
              console.error("Erro lendo codigo de barras", erroLeitura);
            }
            if (ativo) {
              setTentativas((atual) => atual + 1);
            }
            return;
          }
          const digitos = resultado.getText().replace(/\D/g, "");
          // DECISAO: aceita 44/47/48 digitos (os 3 formatos que
          // validarLinhaDigitavel ja sabe reconhecer), nao so 44.
          // PORQUE: uma leitura parcial/ruidosa pode decodificar um numero
          // de tamanho errado - descartar silenciosamente e deixar a camera
          // continuar tentando e melhor que propagar lixo pro formulario.
          // Nao trava em "so codigo de barras" porque o QR de teste pode
          // carregar qualquer um dos 3 formatos.
          if (TAMANHOS_ACEITOS.includes(digitos.length)) {
            controlesAtuais.stop();
            aoLer(digitos);
          }
        }
      )
      .catch(() => {
        if (ativo) {
          setErro("Não foi possível acessar a câmera. Verifique a permissão do navegador ou digite o código manualmente.");
        }
      });

    return () => {
      ativo = false;
      controls?.stop();
    };
  }, [aoLer]);

  return (
    <div className={styles.overlay} role="dialog" aria-label="Escanear código de barras">
      <div className={styles.painel}>
        <div className={styles.cabecalho}>
          <strong>Escanear código de barras</strong>
          <button type="button" onClick={aoFechar} className={styles.fechar} aria-label="Fechar leitor">
            ✕
          </button>
        </div>
        {erro ? (
          <p role="alert" className={styles.erro}>
            {erro}
          </p>
        ) : (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} className={styles.video} muted />
            <p className={styles.dica}>
              Aponte a câmera para o código de barras do boleto, ou para um QR code contendo os dígitos.
            </p>
            {tentativas > 20 && (
              <p className={styles.dica}>
                Nenhum código reconhecido ainda ({tentativas} tentativas). Código de barras impresso (ITF) é
                sensível a foco/distância/ângulo — se estiver difícil, gere um QR code com o número e teste com ele.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
