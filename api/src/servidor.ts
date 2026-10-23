// Monta o servidor (usado por index.ts e pelos testes).
import fs from 'node:fs';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { abrirBanco } from './db.js';
import { ErroApi, enviarProblema } from './problemas.js';
import { configurarSeguranca } from './seguranca.js';
import { registrarCalculos } from './modulos/calculos.js';
import { registrarCatalogos } from './modulos/catalogos.js';
import { registrarMotor } from './modulos/motor.js';
import { carregarSchema } from './modulos/validacao.js';

export interface OpcoesApp {
  pastaDados?: string;
  porta?: number;
  token?: string;
  log?: boolean;
  servirInterface?: boolean;
}

export async function construirApp(op: OpcoesApp = {}) {
  const porta = op.porta ?? config.porta;
  const app = Fastify({
    logger: op.log === false ? false : { level: 'info', redact: ['req.headers.authorization', 'req.headers.cookie'] },
    bodyLimit: config.limiteCorpoBytes,
  });

  carregarSchema(config.schemaEspecificacao);
  const db = abrirBanco(op.pastaDados ?? config.pastaDados);
  app.addHook('onClose', async () => db.close());

  // Aceita application/merge-patch+json como JSON.
  app.addContentTypeParser('application/merge-patch+json', { parseAs: 'string' }, (_req, body, done) => {
    try { done(null, JSON.parse(body as string)); } catch (e) { done(e as Error, undefined); }
  });

  app.setErrorHandler((erro, _req, reply) => {
    if (erro instanceof ErroApi) return enviarProblema(reply, erro);
    const e = erro as { statusCode?: number; code?: string; message: string };
    if (e.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return enviarProblema(reply, new ErroApi(413, 'ARQUIVO_GRANDE_DEMAIS', 'Conteúdo maior que o permitido'));
    }
    if (e.statusCode && e.statusCode < 500) {
      return enviarProblema(reply, new ErroApi(e.statusCode, 'REQUISICAO_INVALIDA', 'Requisição inválida', e.message));
    }
    reply.log.error(erro);
    return enviarProblema(reply, new ErroApi(500, 'ERRO_INTERNO', 'Erro interno', 'Veja o terminal do app para detalhes.'));
  });

  await app.register(cookie);
  configurarSeguranca(app, { porta, origensExtras: config.origensDev, token: op.token });

  app.get('/v1/saude', async () => ({ ok: true, app: 'pjecalc-facil', versao: '0.1.0' }));
  registrarCatalogos(app);
  registrarCalculos(app, db);
  registrarMotor(app, db);

  const servindoInterface = (op.servirInterface ?? true) && fs.existsSync(config.pastaInterface);
  if (servindoInterface) {
    await app.register(fastifyStatic, { root: config.pastaInterface, wildcard: true });
  }

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/v1/')) return enviarProblema(reply, new ErroApi(404, 'NAO_ENCONTRADO', 'Rota não encontrada'));
    // SPA: qualquer outra rota (que não seja arquivo) devolve a interface.
    if (servindoInterface && !/\.[a-z0-9]+$/i.test(req.url.split('?')[0])) return reply.sendFile('index.html');
    return reply.status(404).type('text/plain; charset=utf-8')
      .send('Interface não compilada. Em desenvolvimento use http://localhost:5173 (npm run dev) ou rode "npm run build".');
  });

  return app;
}
