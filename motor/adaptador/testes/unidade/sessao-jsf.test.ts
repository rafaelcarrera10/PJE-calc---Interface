import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { aplicar, codificarLatin1, lerAcoesJsfcljs, SessaoJsf } from '../../src/nucleo/sessao-jsf.js';
import { ErroAdaptador } from '../../src/nucleo/erros.js';

test('aplicar: substitui e remove pelo nome, preservando a ordem', () => {
  const campos: [string, string][] = [['a', '1'], ['b', '2'], ['b', '3'], ['c', '4']];
  assert.deepEqual(aplicar(campos, { b: 'x', c: null, d: 'novo' }), [['a', '1'], ['b', 'x'], ['d', 'novo']]);
});

test('codificarLatin1: acentos em ISO-8859-1, espaço como +, fora do Latin-1 como referência numérica', () => {
  assert.equal(codificarLatin1([['nome', 'Ação 1'], ['x', '€']]), 'nome=A%E7%E3o+1&x=%26%238364%3B');
});

test('lerAcoesJsfcljs: extrai os parâmetros do download disparado pela resposta A4J', () => {
  const xml = `<script>//<![CDATA[ if(typeof jsfcljs == 'function') { jsfcljs(document.getElementById('formulario'),{'formulario:linkDownloadConsolidado':'formulario:linkDownloadConsolidado'},''); } //]]></script>`;
  assert.deepEqual(lerAcoesJsfcljs(xml), [{ 'formulario:linkDownloadConsolidado': 'formulario:linkDownloadConsolidado' }]);
});

// Servidor que imita o PJe-Calc: cookie de sessão, navegação A4J por redirect, ViewState novo e download.
let servidor: http.Server;
let base: string;
let emAndamento = 0;
let maximoSimultaneo = 0;
const recebidos: { url: string; corpo: string; cookie?: string }[] = [];

const pagina = (viewState: string, extra = '') => `<html><body><form id="formulario" action="/pjecalc/pages/a.jsf">
  <input type="hidden" name="formulario" value="formulario">
  <input type="text" name="formulario:data" value="">
  <input type="hidden" name="javax.faces.ViewState" value="${viewState}">${extra}</form></body></html>`;

before(async () => {
  servidor = http.createServer((req, res) => {
    let corpo = '';
    req.on('data', (c) => (corpo += c));
    req.on('end', async () => {
      emAndamento++;
      maximoSimultaneo = Math.max(maximoSimultaneo, emAndamento);
      recebidos.push({ url: req.url!, corpo, cookie: req.headers.cookie });
      await new Promise((r) => setTimeout(r, 20));
      emAndamento--;
      if (req.method === 'GET' && req.url === '/pjecalc/pages/a.jsf') {
        res.setHeader('set-cookie', 'JSESSIONID=ABC; Path=/pjecalc/; HttpOnly');
        res.setHeader('content-type', 'text/html;charset=ISO-8859-1');
        return res.end(pagina('j_id1'));
      }
      if (req.method === 'GET' && req.url === '/pjecalc/pages/b.jsf?conversationId=2') {
        res.setHeader('content-type', 'text/html;charset=ISO-8859-1');
        return res.end(pagina('j_id5', '<span class="rich-messages-label">ok</span>'));
      }
      const p = new URLSearchParams(corpo);
      if (p.get('menu')) {
        res.setHeader('ajax-response', 'redirect');
        res.setHeader('location', '/pjecalc/pages/b.jsf?conversationId=2');
        return res.end('<html/>');
      }
      if (p.get('imprimir')) {
        res.setHeader('content-type', 'text/xml;charset=UTF-8');
        return res.end(`<html><span id="ajax-view-state"><input type="hidden" name="javax.faces.ViewState" value="j_id9"/></span>
          <script>jsfcljs(document.getElementById('formulario'),{'formulario:link':'formulario:link'},'');</script></html>`);
      }
      if (p.get('formulario:link')) {
        res.setHeader('content-disposition', 'attachment; filename="..\\..\\RELATORIO.pdf"');
        res.setHeader('content-type', 'application/pdf');
        return res.end('%PDF-1.4');
      }
      if (p.get('quebra')) {
        res.setHeader('content-type', 'text/html');
        return res.end('<p>Erro Interno no Servidor</p>');
      }
      res.statusCode = 404;
      res.end();
    });
  });
  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((r) => servidor.close(() => r())));

test('sessão: guarda o cookie, segue a navegação A4J e atualiza o ViewState da resposta parcial', async () => {
  const s = new SessaoJsf(base);
  const a = await s.abrir('/pjecalc/pages/a.jsf');
  const nav = await s.acionar(a, 'menu');
  assert.equal(nav.pagina.url, `${base}/pjecalc/pages/b.jsf?conversationId=2`);
  assert.equal(recebidos.at(-1)?.cookie, 'JSESSIONID=ABC');
  const post = new URLSearchParams(recebidos.at(-2)!.corpo);
  assert.equal(post.get('AJAXREQUEST'), '_viewRoot');
  assert.equal(post.get('javax.faces.ViewState'), 'j_id1');

  const impressao = await s.acionar(nav.pagina, 'imprimir', { 'formulario:data': '31/10/2026' });
  assert.deepEqual(impressao.acoes, [{ 'formulario:link': 'formulario:link' }]);
  const campos = new Map(impressao.pagina.formulario.campos);
  assert.equal(campos.get('javax.faces.ViewState'), 'j_id9');
  assert.equal(campos.get('formulario:data'), '31/10/2026', 'mantém os valores enviados');
  assert.equal(campos.has('imprimir'), false, 'não repete o componente acionado');

  const arquivo = await s.baixar(impressao.pagina, impressao.acoes[0]!);
  assert.equal(arquivo.nome, 'RELATORIO.pdf', 'só o nome-base do Content-Disposition');
  assert.equal(new TextDecoder().decode(arquivo.conteudo), '%PDF-1.4');
});

test('sessão: acionar um campo cujo nome é o id do componente não troca o valor dele', async () => {
  const s = new SessaoJsf(base);
  const a = await s.abrir('/pjecalc/pages/a.jsf');
  await s.acionar(a, 'formulario:data', { 'formulario:data': 'valor' }).catch(() => undefined);
  const post = new URLSearchParams(recebidos.at(-1)!.corpo);
  assert.deepEqual(post.getAll('formulario:data'), ['valor', 'formulario:data'], 'campo preservado e parâmetro do componente acrescentado');
});

test('sessão: requisições sempre em sequência, mesmo disparadas juntas', async () => {
  const s = new SessaoJsf(base);
  maximoSimultaneo = 0;
  await Promise.all([s.abrir('/pjecalc/pages/a.jsf'), s.abrir('/pjecalc/pages/a.jsf'), s.abrir('/pjecalc/pages/a.jsf')]);
  assert.equal(maximoSimultaneo, 1);
});

test('sessão: erro interno do PJe-Calc e motor fora do ar viram ErroAdaptador', async () => {
  const s = new SessaoJsf(base);
  const a = await s.abrir('/pjecalc/pages/a.jsf');
  await assert.rejects(s.acionar(a, 'quebra'), (e) => e instanceof ErroAdaptador && e.codigo === 'MOTOR_FALHOU');
  await assert.rejects(new SessaoJsf('http://127.0.0.1:1').abrir('/x'), (e) => e instanceof ErroAdaptador && e.codigo === 'MOTOR_INDISPONIVEL');
});
