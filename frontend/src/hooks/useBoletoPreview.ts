import { useEffect, useState } from "react";
import { BASE_URL } from "../api/config";
import type { SagaState } from "./usePaymentSaga";

export type BoletoPreview = {
    encontrado: boolean;
    beneficiario: string | null;
    valor: number | null;
    vencimento: string | null;
    tipo: string | null;
    banco: string | null;
    motivoFalha: string | null;
    sagaExistente: string | null;
    estadoSagaExistente: SagaState | null;
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

        fetch(`${BASE_URL}/boletos/${linhaDigitavel}`, { signal: controller.signal })
            .then((res) => res.json())
            .then((dados: BoletoPreview) => {
                setPreview(dados);
                setCarregando(false);
            })
            .catch((e) => {
                if (e.name === "AbortError") {
                    return;
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