import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";
import styles from "./LeitorCodigoBarras.module.scss";

type LeitorCodigoBarrasProps = {
  aoLer: (codigoDeBarras: string) => void;
  aoFechar: () => void;
};

const HINTS = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.ITF, BarcodeFormat.QR_CODE]]]);
const TAMANHOS_ACEITOS = [44, 47, 48]; // codigo de barras, boleto bancario, convenio

export function LeitorCodigoBarras({ aoLer, aoFechar }: LeitorCodigoBarrasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState<string | null>(null);
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
            if (erroLeitura && !(erroLeitura instanceof NotFoundException)) {
              console.error("Erro lendo codigo de barras", erroLeitura);
            }
            if (ativo) {
              setTentativas((atual) => atual + 1);
            }
            return;
          }
          const digitos = resultado.getText().replace(/\D/g, "");
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
