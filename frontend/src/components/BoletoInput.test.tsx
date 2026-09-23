import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BoletoInput } from "./BoletoInput";

describe("BoletoInput", () => {
    it("nao mostra erro quando o campo esta vazio", () => {
        render(
            <BoletoInput
                linhaDigitavel=""
                aoAlterar={vi.fn()}
                resultado={{ valido: false, formato: "INVALIDO", motivo: "TAMANHO_INVALIDO" }}
            />
        );

        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("mostra erro quando a linha ja tem tamanho suficiente mas e invalida", () => {
        render(
            <BoletoInput
                linhaDigitavel={"1".repeat(43)}
                aoAlterar={vi.fn()}
                resultado={{ valido: false, formato: "INVALIDO", motivo: "TAMANHO_INVALIDO" }}
            />
        );

        expect(screen.queryByRole("alert")).not.toBeNull();
    });

    it("mostra a mensagem especifica do motivo de invalidez, nao um texto generico", () => {
        render(
            <BoletoInput
                linhaDigitavel={"1".repeat(47)}
                aoAlterar={vi.fn()}
                resultado={{ valido: false, formato: "BOLETO", motivo: "DV_BLOCO_2_INVALIDO" }}
            />
        );

        expect(screen.getByRole("alert").textContent).toContain("2º bloco");
    });

    it("nao mostra erro quando a linha e valida", () => {
        render(
            <BoletoInput
                linhaDigitavel={"1".repeat(47)}
                aoAlterar={vi.fn()}
                resultado={{ valido: true, formato: "BOLETO", motivo: null }}
            />
        );

        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("repassa o valor bruto digitado pra aoAlterar, sem sanitizar (isso e responsabilidade do hook)", () => {
        const aoAlterar = vi.fn();
        render(
            <BoletoInput
                linhaDigitavel=""
                aoAlterar={aoAlterar}
                resultado={{ valido: false, formato: "INVALIDO", motivo: "TAMANHO_INVALIDO" }}
            />
        );

        fireEvent.change(screen.getByLabelText("Linha digitável"), {
            target: { value: "341.91 111" },
        });

        expect(aoAlterar).toHaveBeenCalledWith("341.91 111");
    });

    it("com so 3 digitos, ja mostra o banco - sem esperar linha completa nem requisicao", () => {
        render(
            <BoletoInput
                linhaDigitavel="341"
                aoAlterar={vi.fn()}
                resultado={{ valido: false, formato: "INVALIDO", motivo: "TAMANHO_INVALIDO" }}
            />
        );

        expect(screen.getByText("Itaú Unibanco")).toBeTruthy();
    });

    it("com linha de boleto completa (47 digitos), mostra tipo e valor extraidos localmente", () => {
        // 37 primeiros digitos + "0000015000" (valor = R$150,00 nos ultimos 10 digitos)
        const linha = "3".repeat(37) + "0000015000";
        render(
            <BoletoInput
                linhaDigitavel={linha}
                aoAlterar={vi.fn()}
                resultado={{ valido: false, formato: "BOLETO", motivo: "DV_BLOCO_1_INVALIDO" }}
            />
        );

        expect(screen.getByText("Boleto bancário")).toBeTruthy();
        expect(screen.getByText(/R\$\s*150,00/)).toBeTruthy();
    });

    it("com menos de 3 digitos, nao mostra previa nenhuma", () => {
        render(
            <BoletoInput
                linhaDigitavel="34"
                aoAlterar={vi.fn()}
                resultado={{ valido: false, formato: "INVALIDO", motivo: "TAMANHO_INVALIDO" }}
            />
        );

        expect(screen.queryByText("Banco")).toBeNull();
    });
});