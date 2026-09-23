import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSaldo } from "../hooks/useSaldo";
import styles from "./Layout.module.scss";

type LayoutProps = {
  children: ReactNode;
};

// DECISAO: Layout fica em components/, nao em pages/ - e usado por TODAS as
// paginas, nao e uma tela em si.
export function Layout({ children }: LayoutProps) {
  const { saldo, erro, consultar } = useSaldo();

  return (
    <div className={styles.pagina}>
      <header className={styles.cabecalho}>
        <div className={styles.marca}>
          <Link to="/" className={styles.logo}>
            itaú
          </Link>
          <span className={styles.separador}>|</span>
          <span>Pagamentos</span>
          <span className={styles.tagPj}>PJ</span>
        </div>
        <div className={styles.usuario} onMouseEnter={consultar}>
          <span className={styles.avatar} aria-hidden="true">
            👤
          </span>
          João Victor Pereira
          <div className={styles.tooltipSaldo} role="tooltip">
            {erro ? (
              <span>Não foi possível carregar o saldo.</span>
            ) : saldo ? (
              <>
                <dl>
                  <dt>Disponível</dt>
                  <dd>{formatarValor(saldo.saldoDisponivel)}</dd>
                  <dt>Saldo real</dt>
                  <dd>{formatarValor(saldo.saldoReal)}</dd>
                </dl>
                <Link to="/?view=autodeposito" className={styles.linkDepositar}>
                  + Autodepósito
                </Link>
              </>
            ) : (
              <span>Carregando saldo...</span>
            )}
          </div>
        </div>
      </header>
      <main className={styles.conteudo}>{children}</main>
      <footer className={styles.rodape}>
        <span>© 2026 Itaú Unibanco S.A. · CNPJ 60.701.190/0001-04</span>
        <span className={styles.seguranca}>
          <span aria-hidden="true">🔒</span> Conexão segura SSL
        </span>
      </footer>
    </div>
  );
}

function formatarValor(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}
