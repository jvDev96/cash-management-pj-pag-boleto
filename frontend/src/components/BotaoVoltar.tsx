import { useNavigate } from "react-router-dom";
import styles from "./BotaoVoltar.module.scss";

// DECISAO: componente proprio, nao so uma classe CSS compartilhada.
// PORQUE: usado em 2 paginas com o MESMO comportamento (navigate(-1)) - nao
// so o estilo se repetia, o onClick tambem. Extrair o componente inteiro
// evita duplicar as duas coisas.
export function BotaoVoltar() {
  const navigate = useNavigate();

  return (
    <button type="button" className={styles.botao} onClick={() => navigate(-1)}>
      ← Voltar
    </button>
  );
}
