// Ponto de entrada: npm start (ou npm run dev).
import { config } from './config.js';
import { construirApp } from './servidor.js';

const app = await construirApp();
await app.listen({ host: config.host, port: config.porta });

const url = `http://127.0.0.1:${config.porta}`;
console.log(`
  PJE Calc Fácil — API local
  ─────────────────────────────────────────────
  Interface:  ${url}   (em desenvolvimento: http://localhost:5173)
  API:        ${url}/v1
  Dados:      ${config.pastaDados}
  Token para scripts (Authorization: Bearer):
              ${app.tokenSessao}
  Motor PJe-Calc: não conectado (Fase 1)
`);

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, async () => { await app.close(); process.exit(0); });
}
