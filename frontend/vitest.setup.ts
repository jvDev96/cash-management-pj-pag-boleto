import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// DECISAO: cleanup() rodando uma unica vez aqui, via setupFiles, em vez de
// repetir afterEach(cleanup) em cada arquivo *.test.tsx.
// PORQUE: sem test.globals=true no vite.config.ts (decisao deliberada, os
// arquivos de teste importam describe/it/expect explicitamente), a
// auto-limpeza do Testing Library nao dispara sozinha - sem isso, cada
// render() de um teste fica montado no DOM e "vaza" pro proximo teste.
afterEach(() => {
  cleanup();
});
