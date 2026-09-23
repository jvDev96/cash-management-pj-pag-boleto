import { Link } from "react-router-dom";
import { usePaymentHistory } from "../hooks/usePaymentHistory";
import type { PagamentoResumo } from "../hooks/usePaymentHistory";
import type { SagaState } from "../hooks/usePaymentSaga";
import { BotaoVoltar } from "../components/BotaoVoltar";
import styles from "./HistoricoPage.module.scss";

export function HistoricoPage() {
    const { pagamentos, paginaAtual, totalPaginas, carregando, erro, irParaPagina } = usePaymentHistory();

    return (
        <div className={styles.pagina}>
            <BotaoVoltar />
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

// DECISAO: o item inteiro e um <Link>, nao so um onClick no <li>.
// PORQUE: navegacao por link (com <a> de verdade por baixo, via react-router)
// da suporte nativo a "abrir em nova aba"/"copiar link" e funciona sem JS -
// um onClick simulando navegacao perderia isso. E troca de rota, continua
// SPA (react-router intercepta o clique, nunca recarrega a pagina).
function ItemHistorico({ pagamento }: { pagamento: PagamentoResumo }) {
    const categoria = categoriaPorEstado(pagamento.estado);

    return (
        <li>
            <Link to={`/historico/${pagamento.sagaId}`} className={styles.item}>
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

// DECISAO: categoria (concluido/falhou/andamento) e um mapeamento novo, nao
// reaproveita StatusLinha do timeline/montarTimeline.ts.
// PORQUE: StatusLinha e sobre a POSICAO de uma etapa na timeline
// (processando/pendente/concluido/falhou POR LINHA); aqui e sobre o
// DESFECHO do pagamento inteiro, so 3 categorias - conceito de dominio
// diferente, mesmo parecendo similar.
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
