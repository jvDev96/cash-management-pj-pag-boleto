import { useEffect, useState } from "react";
import { BASE_URL } from "../api/config";

export type BoletoPreview = {
    encontrado: boolean;
    beneficiario: string | null;
    valor: number | null;
    vencimento: string | null;
    tipo: string | null;
    banco: string | null;
    motivoFalha: string | null;
};

export function useBoletoPreview(linhaDigitavel: string, valido: boolean) {
    const [preview, setPreview] = useState<BoletoPreview | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(false);

    useEffect(() => {
        if (!valido) {
            setPreview(null);
            setErro(false);
            setCarregando(false);
            return;
        }

        const controller = new AbortController();
        setCarregando(true);
        setErro(false);

        // DECISAO: parseia o JSON independente do status HTTP (nao checa res.ok).
        // PORQUE: o backend devolve 404 com corpo valido quando nao encontra
        // (encontrado:false + motivoFalha) - isso e uma resposta de dominio, nao
        // um erro de rede. fetch so lanca excecao em falha real (rede fora do ar,
        // CORS bloqueado) ou se o JSON vier corrompido.
        fetch(`${BASE_URL}/boletos/${linhaDigitavel}`, { signal: controller.signal })
            .then((res) => res.json())
            .then((dados: BoletoPreview) => {
                setPreview(dados);
                setCarregando(false);
            })
            .catch((e) => {
                if (e.name === "AbortError") {
                    return; // cancelado por uma linha mais nova - nao mexe em estado
                }
                setPreview(null);
                setErro(true);
                setCarregando(false);
            });

        return () => {
            controller.abort();
        };
    }, [linhaDigitavel, valido]);

    return { preview, carregando, erro };
}