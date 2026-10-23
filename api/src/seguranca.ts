// Proteções do app local (docs/08 §2): Host, Origin e token de sessão aleatório por execução.
import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ErroApi } from './problemas.js';

export const COOKIE_SESSAO = 'pjecalc_sessao';

/** Rotas acessíveis sem sessão. */
const PUBLICAS = new Set(['/v1/saude', '/v1/sessao']);

export interface OpcoesSeguranca {
  porta: number;
  origensExtras: string[];
  token?: string;
}

export function configurarSeguranca(app: FastifyInstance, op: OpcoesSeguranca) {
  const token = op.token ?? crypto.randomBytes(32).toString('hex');
  const hostsAceitos = new Set([`127.0.0.1:${op.porta}`, `localhost:${op.porta}`]);
  const origensAceitas = new Set([`http://127.0.0.1:${op.porta}`, `http://localhost:${op.porta}`, ...op.origensExtras]);

  app.decorate('tokenSessao', token);

  app.addHook('onRequest', async (req, reply) => {
    // 1) Host: barra "DNS rebinding" (um site malicioso apontando seu domínio para 127.0.0.1).
    const host = req.headers.host ?? '';
    if (!hostsAceitos.has(host)) {
      throw new ErroApi(403, 'HOST_RECUSADO', 'Host não permitido', 'O app só atende em 127.0.0.1/localhost.');
    }
    if (!req.url.startsWith('/v1/')) return; // arquivos da interface

    // 2) Origin: requisições que alteram dados só podem vir da própria interface.
    const origem = req.headers.origin;
    if (req.method !== 'GET' && req.method !== 'HEAD' && origem && !origensAceitas.has(origem)) {
      throw new ErroApi(403, 'ORIGEM_RECUSADA', 'Origem não permitida', `Origem ${origem} não é a interface local.`);
    }

    const caminho = req.url.split('?')[0];
    if (PUBLICAS.has(caminho)) return;

    // 3) Token: cookie HttpOnly (interface) ou cabeçalho Authorization: Bearer (scripts locais).
    if (!temToken(req, token)) {
      throw new ErroApi(401, 'NAO_AUTENTICADO', 'Sessão local ausente ou inválida',
        'Abra o app pelo endereço http://127.0.0.1:' + op.porta + ' ou use o token exibido no terminal.');
    }
    void reply;
  });

  /** Entrega o cookie de sessão. SameSite=Strict: nunca é enviado por sites de terceiros. */
  app.get('/v1/sessao', async (_req, reply) => {
    reply.setCookie(COOKIE_SESSAO, token, { httpOnly: true, sameSite: 'strict', path: '/', secure: false });
    return { ok: true };
  });

  return token;
}

function temToken(req: FastifyRequest, token: string): boolean {
  const cookie = req.cookies?.[COOKIE_SESSAO];
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const candidato = cookie ?? auth ?? '';
  const a = Buffer.from(candidato);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

declare module 'fastify' {
  interface FastifyInstance {
    tokenSessao: string;
  }
}
