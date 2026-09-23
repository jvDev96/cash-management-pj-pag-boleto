import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";
import styles from "./LeitorCodigoBarras.module.scss";

type LeitorCodigoBarrasProps = {
  aoLer: (codigoDeBarras: string) => void;
  aoFechar: () => void;
};

// DECISAO: restringe o leitor a BarcodeFormat.ITF (Interleaved 2 of 5), nao
// deixa no padrao (todos os formatos).
// PORQUE: e o simbolo de verdade usado no codigo de barras de boleto - deixar
// o leitor tentando TODOS os formatos a cada frame desperdica processamento
// e aumenta falso positivo (ex: ler um QR code de outra coisa por engano).
const HINTS = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.ITF]]]);

// DECISAO: componente separado, ativado por botao explicito - nunca abre a
// camera sozinho.
// PORQUE: acesso a camera exige permissao do navegador (pode ser negada,
// pode nao existir camera) e so funciona com HTTPS/localhost - e um metodo
// de entrada ADICIONAL ao campo de texto, nunca uma dependencia. Digitar/
// colar continua sendo o caminho principal e mais confiavel.
export function LeitorCodigoBarras({ aoLer, aoFechar }: LeitorCodigoBarrasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState<string | null>(null);

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
            return;
          }
          const digitos = resultado.getText().replace(/\D/g, "");
          // DECISAO: so aceita leitura com exatamente 44 digitos.
          // PORQUE: codigo de barras de boleto tem tamanho fixo - uma
          // leitura parcial/ruidosa do ITF pode decodificar um numero de
          // tamanho errado; descartar silenciosamente e deixar a camera
          // continuar tentando e melhor que propagar lixo pro formulario.
          if (digitos.length === 44) {
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
              Aponte a câmera para o código de barras impresso no boleto (44 dígitos).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
