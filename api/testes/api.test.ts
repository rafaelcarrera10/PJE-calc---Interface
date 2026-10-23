// Testes da API (node:test). Rodar: npm test (na raiz ou em api/).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirApp } from '../src/servidor.js';
import { cnjValido, validarEspecificacao } from '../src/modulos/validacao.js';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const exemplo = JSON.parse(fs.readFileSync(path.join(aqui, '..', '..', 'contratos', 'exemplos', 'calculo-horas-extras.json'), 'utf8'));
const TOKEN = 'token-de-teste';
const H = { host: '127.0.0.1:8080', authorization: `Bearer ${TOKEN}` };
let app: Awaited<ReturnType<typeof construirApp>>;

before(async () => { app = await construirApp({ pastaDados: ':memory:', token: TOKEN, log: false, servirInterface: false }); });
after(async () => { await app.close(); });

test('saúde é pública', async () => {
  const r = await app.inject({ method: 'GET', url: '/v1/saude', headers: { host: '127.0.0.1:8080' } });
  assert.equal(r.statusCode, 200);
});

test('segurança: Host estranho é recusado (DNS rebinding)', async () => {
  const r = await app.inject({ method: 'GET', url: '/v1/calculos', headers: { ...H, host: 'evil.example:8080' } });
  assert.equal(r.statusCode, 403);
  assert.equal(r.json().codigo, 'HOST_RECUSADO');
});

test('segurança: sem token = 401; Origin de outro site = 403', async () => {
  const a = await app.inject({ method: 'GET', url: '/v1/calculos', headers: { host: '127.0.0.1:8080' } });
  assert.equal(a.statusCode, 401);
  const b = await app.inject({ method: 'POST', url: '/v1/calculos', headers: { ...H, origin: 'https://site-malicioso.com' }, payload: exemplo });
  assert.equal(b.statusCode, 403);
  assert.equal(b.json().codigo, 'ORIGEM_RECUSADA');
});

test('sessão: /v1/sessao entrega cookie HttpOnly SameSite=Strict que dá acesso', async () => {
  const s = await app.inject({ method: 'GET', url: '/v1/sessao', headers: { host: '127.0.0.1:8080' } });
  const setCookie = String(s.headers['set-cookie']);
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/);
  const r = await app.inject({ method: 'GET', url: '/v1/calculos', headers: { host: '127.0.0.1:8080', cookie: `pjecalc_sessao=${TOKEN}` } });
  assert.equal(r.statusCode, 200);
});

test('CNJ: dígito verificador', () => {
  assert.equal(cnjValido('0000123-85.2025.5.04.0001'), true);
  assert.equal(cnjValido('0000123-45.2025.5.04.0001'), false);
});

test('fluxo: criar → validar (ok) → editar com If-Match → versões → conflito', async () => {
  const c = await app.inject({ method: 'POST', url: '/v1/calculos', headers: H, payload: exemplo });
  assert.equal(c.statusCode, 201);
  assert.equal(c.headers.etag, '"v1"');
  const id = c.json().id;

  const v = await app.inject({ method: 'POST', url: `/v1/calculos/${id}/validacoes`, headers: H });
  assert.equal(v.statusCode, 200);
  assert.equal(v.json().valido, true, JSON.stringify(v.json().erros));

  const p = await app.inject({
    method: 'PATCH', url: `/v1/calculos/${id}`,
    headers: { ...H, 'if-match': '"v1"', 'content-type': 'application/merge-patch+json' },
    payload: JSON.stringify({ contrato: { demissao: '2018-01-01' } }),
  });
  assert.equal(p.statusCode, 200);
  assert.equal(p.headers.etag, '"v2"');
  assert.equal(p.json().especificacao.contrato.admissao, '2019-03-01', 'merge patch preserva o resto');

  const v2 = await app.inject({ method: 'POST', url: `/v1/calculos/${id}/validacoes`, headers: H });
  assert.equal(v2.json().valido, false);
  assert.ok(v2.json().erros.some((e: any) => e.caminho === '/contrato/demissao' && e.codigo === 'DEMISSAO_ANTES_ADMISSAO'));

  const conflito = await app.inject({
    method: 'PATCH', url: `/v1/calculos/${id}`, headers: { ...H, 'if-match': '"v1"' }, payload: { _titulo: 'x' },
  });
  assert.equal(conflito.statusCode, 409);

  const versoes = await app.inject({ method: 'GET', url: `/v1/calculos/${id}/versoes`, headers: H });
  assert.equal(versoes.json().length, 2);
});

test('validação traduz erros do schema para português com caminho', async () => {
  const c = await app.inject({ method: 'POST', url: '/v1/calculos', headers: H, payload: { versaoEspecificacao: '1.0', contrato: { admissao: '31/02/2020' } } });
  const id = c.json().id;
  const v = (await app.inject({ method: 'POST', url: `/v1/calculos/${id}/validacoes`, headers: H })).json();
  const caminhos = v.erros.map((e: any) => e.caminho);
  assert.ok(caminhos.includes('/processo'));
  assert.ok(caminhos.includes('/contrato/admissao'));
  assert.ok(caminhos.includes('/contrato/ajuizamento'));
  assert.ok(v.erros.every((e: any) => /[a-zà-ú]/i.test(e.mensagem)));
});

test('liquidar: valida antes e responde 503 honesto (sem motor)', async () => {
  const c = await app.inject({ method: 'POST', url: '/v1/calculos', headers: H, payload: exemplo });
  const r = await app.inject({ method: 'POST', url: `/v1/calculos/${c.json().id}/liquidacoes`, headers: H, payload: { dataLiquidacao: '2026-10-31' } });
  assert.equal(r.statusCode, 503);
  assert.equal(r.json().codigo, 'MOTOR_INDISPONIVEL');
  assert.equal(r.headers['content-type'], 'application/problem+json; charset=utf-8');
});

test('catálogo de verbas real (provisório) com reflexos', async () => {
  const r = (await app.inject({ method: 'GET', url: '/v1/catalogos/verbas?busca=horas extras', headers: H })).json();
  const he = r.verbas.find((v: any) => v.nome === 'HORAS EXTRAS 50%');
  assert.ok(he);
  assert.ok(he.reflexosDisponiveis.includes('13º SALÁRIO'));
  assert.equal(r.provisorio, true);
});

test('resolvida=true preenche os padrões do schema', async () => {
  const c = await app.inject({ method: 'POST', url: '/v1/calculos', headers: H, payload: { ...exemplo, fgts: {} } });
  const r = (await app.inject({ method: 'GET', url: `/v1/calculos/${c.json().id}?resolvida=true`, headers: H })).json();
  assert.equal(r.especificacao.parametros.feriadoEstadual, true);
  assert.equal(r.especificacao.parametros.zerarValoresNegativos, false, 'mesmo padrão do PJe-Calc');
  assert.equal(r.especificacao.fgts.destino, 'recolher');
  assert.equal(r.especificacao.fgts.baseDaMulta, 'devido');
});

test('gabaritos do adaptador: especificações são válidas', () => {
  const gabaritos = path.join('motor', 'adaptador', 'testes', 'gabaritos');
  for (const f of [
    path.join(gabaritos, 'gabarito-1-rescisao.json'),
    path.join('contratos', 'exemplos', 'calculo-horas-extras.json'),
    path.join(gabaritos, 'gabarito-3-insalubridade.json'),
  ]) {
    const v = validarEspecificacao(JSON.parse(fs.readFileSync(path.join(aqui, '..', '..', f), 'utf8')));
    assert.equal(v.valido, true, `${f}: ${JSON.stringify(v.erros)}`);
  }
});
