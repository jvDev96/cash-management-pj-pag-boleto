import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BoletoInput } from "./BoletoInput";

describe("BoletoInput", () => {
    it("nao mostra erro quando o campo esta vazio", () => {
        render(
            <BoletoInput
                linhaDigitavel=""
                aoAlterar={vi.fn()}
                resultado={{ valido: false, formato: "INVALIDO" }}
            />
        );

        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("mostra erro quando a linha ja tem tamanho suficiente mas e invalida", () => {
        render(
            <BoletoInput
                linhaDigitavel={"1".repeat(43)}
                aoAlterar={vi.fn()}
                resultado={{ valido: false, formato: "INVALIDO" }}
            />
        );

        expect(screen.queryByRole("alert")).not.toBeNull();
    });

    it("nao mostra erro quando a linha e valida", () => {
        render(
            <BoletoInput
                linhaDigitavel={"1".repeat(47)}
                aoAlterar={vi.fn()}
                resultado={{ valido: true, formato: "BOLETO" }}
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
                resultado={{ valido: false, formato: "INVALIDO" }}
            />
        );

        fireEvent.change(screen.getByLabelText("Linha digitável"), {
            target: { value: "341.91 111" },
        });

        expect(aoAlterar).toHaveBeenCalledWith("341.91 111");
    });
});