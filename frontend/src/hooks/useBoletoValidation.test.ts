import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useBoletoValidation } from "./useBoletoValidation";

describe("useBoletoValidation", () => {
    it("estado inicial: linha vazia, formato invalido", () => {
        const { result } = renderHook(() => useBoletoValidation());

        expect(result.current.linhaDigitavel).toBe("");
        expect(result.current.resultado).toEqual({ valido: false, formato: "INVALIDO", motivo: "TAMANHO_INVALIDO" });
    });

    it("sanitiza pontuacao ao alterar a linha", () => {
        const { result } = renderHook(() => useBoletoValidation());

        act(() => {
            result.current.alterarLinhaDigitavel("341.91 111.11 2");
        });

        expect(result.current.linhaDigitavel).toBe("34191111112");
    });

    it("sanitiza pontuacao ao alterar a linha, formato boleto", () => {
        const { result } = renderHook(() => useBoletoValidation());

        act(() => {
            result.current.alterarLinhaDigitavel("341.91 111.11 2 341.91 111.11 2 341.91 111.11 2 341.91 111.11 2 256");
        });

        expect(result.current.linhaDigitavel).toBe("34191111112341911111123419111111234191111112256");
        expect(result.current.resultado).toEqual({ valido: false, formato: "BOLETO", motivo: "DV_BLOCO_2_INVALIDO" });
    });
});