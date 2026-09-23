import { Link } from "react-router-dom";
import { usePaymentHistory } from "../hooks/usePaymentHistory";
import type { PagamentoResumo } from "../hooks/usePaymentHistory";
import type { SagaState } from "../hooks/usePaymentSaga";
import styles from "./HistoricoPage.module.scss";

export function HistoricoPage() {
    const { pagamentos, paginaAtual, totalPaginas, carregando, erro, irParaPagina } = usePaymentHistory();

    return (
        <div className={styles.pagina}>
            <h1 className={styles.titulo}>Histórico de Pagamentos</h1>
            <p className={styles.subtitulo}>Consulte seus pagamentos anteriores</p>

            {carregando && <p>Carregando...</p>}
            {erro && (
                <p role="alert" className={styles.erro}>
                    Não foi possível carregar o histórico.
                </p>
            )}
            {!carregando && !erro && pagamentos.length === 0 && <p>Nenhum pagamento encontrado.</p>}

            {pagamentos.length > 0 && (
                <ul className={styles.lista}>
                    {pagamentos.map((pagamento) => (
                        <ItemHistorico key={pagamento.sagaId} pagamento={pagamento} />
                    ))}
                </ul>
            )}

            {totalPaginas > 1 && (
                <div className={styles.paginacao}>
                    <button
                        type="button"
                        disabled={paginaAtual === 0}
                        onClick={() => irParaPagina(paginaAtual - 1)}
                    >
                        Anterior
                    </button>
                    <span>
                        Página {paginaAtual + 1} de {totalPaginas}
                    </span>
                    <button
                        type="button"
                        disabled={paginaAtual >= totalPaginas - 1}
                        onClick={() => irParaPagina(paginaAtual + 1)}
                    >
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
}

function ItemHistorico({ pagamento }: { pagamento: PagamentoResumo }) {
    const categoria = categoriaPorEstado(pagamento.estado);

    return (
        <li>
            <Link to={`/?view=historico&saga=${pagamento.sagaId}`} className={styles.item}>
                <span className={`${styles.icone} ${styles[`icone${capitalizar(categoria)}`]}`} aria-hidden="true">
                    {iconePorCategoria(categoria)}
                </span>
                <div className={styles.info}>
                    <strong>{pagamento.beneficiario ?? "Beneficiário não identificado"}</strong>
                    <span className={styles.data}>{formatarData(pagamento.atualizadoEm)}</span>
                </div>
                <div className={styles.resumoValor}>
                    <span className={styles.valor}>{formatarValor(pagamento.valor)}</span>
                    <span className={`${styles.rotulo} ${styles[`rotulo${capitalizar(categoria)}`]}`}>
                        {rotuloPorCategoria(categoria)}
                    </span>
                </div>
            </Link>
        </li>
    );
}

type Categoria = "concluido" | "falhou" | "andamento";

function categoriaPorEstado(estado: SagaState): Categoria {
    if (estado === "CONCLUIDO") {
        return "concluido";
    }
    if (estado === "REJEITADO" || estado === "FALHOU") {
        return "falhou";
    }
    return "andamento";
}

function iconePorCategoria(categoria: Categoria): string {
    switch (categoria) {
        case "concluido":
            return "✓";
        case "falhou":
            return "✕";
        case "andamento":
            return "●";
    }
}

function rotuloPorCategoria(categoria: Categoria): string {
    switch (categoria) {
        case "concluido":
            return "Concluído";
        case "falhou":
            return "Falhou";
        case "andamento":
            return "Em andamento";
    }
}

function capitalizar(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarValor(valor: number): string {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function formatarData(timestampIso: string): string {
    return new Date(timestampIso).toLocaleDateString("pt-BR");
}
