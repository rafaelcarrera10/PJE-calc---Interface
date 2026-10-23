// Configuração do app local. Tudo pode ser sobrescrito por variáveis de ambiente.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ_API = path.resolve(aqui, '..');
export const RAIZ_PROJETO = path.resolve(RAIZ_API, '..');

/** Pasta de dados padrão por sistema (ADR-0006). Em desenvolvimento, use PJECALC_FACIL_DADOS=./.dados */
function pastaDadosPadrao(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), 'PJECalcFacil', 'dados');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'PJECalcFacil', 'dados');
  }
  return path.join(os.homedir(), '.local', 'share', 'PJECalcFacil', 'dados');
}

export const config = {
  /** Sempre 127.0.0.1: o app nunca escuta na rede (docs/08). */
  host: '127.0.0.1',
  porta: Number(process.env.PORTA ?? 8080),
  pastaDados: path.resolve(process.env.PJECALC_FACIL_DADOS ?? pastaDadosPadrao()),
  /** Interface compilada (npm run build na raiz). Em desenvolvimento, o Vite serve a interface na 5173. */
  pastaInterface: path.join(RAIZ_PROJETO, 'interface', 'dist'),
  schemaEspecificacao: path.join(RAIZ_PROJETO, 'contratos', 'schemas', 'especificacao-calculo.schema.json'),
  /** Origens aceitas para requisições que alteram dados (anti-CSRF). */
  origensDev: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  limiteCorpoBytes: 2 * 1024 * 1024,
};
