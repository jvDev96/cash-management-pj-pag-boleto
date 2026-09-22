import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // DECISAO: pool 'vmThreads' em vez do padrao.
    // PORQUE: o padrao recria o jsdom do zero pra cada arquivo de teste (~80%
    // do tempo total, medido). vmThreads reaproveita o ambiente entre
    // arquivos mantendo isolamento por arquivo - mais rapido sem abrir mao da
    // seguranca de "um teste nao vaza estado pro outro".
    pool: 'vmThreads',
  },
})
