import { test } from 'node:test';
import assert from 'node:assert/strict';
import { camposDoFormulario, idPorTexto, lerHtml, lerMensagens, lerPagina } from '../../src/nucleo/html.js';

const FORM = `
<form id="formulario" action="/pjecalc/pages/x.jsf" enctype="multipart/form-data">
  <input type="hidden" name="formulario" value="formulario">
  <input type="text" name="nome" value="C&aacute;lculo">
  <input type="text" name="bloqueado" value="x" disabled>
  <input type="checkbox" name="marcado" checked>
  <input type="checkbox" name="desmarcado" value="s">
  <input type="radio" name="r" value="A">
  <input type="radio" name="r" value="B" checked>
  <input type="file" name="arquivo">
  <input type="submit" name="enviar" value="Enviar">
  <select name="sel"><option value="1">um</option><option value="2" selected>dois</option></select>
  <select name="semSelecao"><option value="primeiro">p</option><option value="segundo">s</option></select>
  <textarea name="obs">linha</textarea>
  <input type="hidden" name="javax.faces.ViewState" value="j_id1">
</form>`;

test('campos: serializa como o navegador (marcados, selecionados, sem desabilitados, arquivos e botões)', () => {
  const form = lerHtml(FORM).getElementById('formulario')!;
  assert.deepEqual(camposDoFormulario(form), [
    ['formulario', 'formulario'],
    ['nome', 'Cálculo'],
    ['marcado', 'on'],
    ['r', 'B'],
    ['sel', '2'],
    ['semSelecao', 'primeiro'],
    ['obs', 'linha'],
    ['javax.faces.ViewState', 'j_id1'],
  ]);
});

test('página: lê ação, multipart e campos do formulário principal', () => {
  const p = lerPagina(FORM, 'http://127.0.0.1:9357/pjecalc/pages/x.jsf');
  assert.equal(p.formulario.action, '/pjecalc/pages/x.jsf');
  assert.equal(p.formulario.multipart, true);
  assert.throws(() => lerPagina('<p>sem formulário</p>', 'u'), /não encontrado/);
});

test('mensagens: tipo pelo marcador e sem repetição entre painéis', () => {
  const painel = (tipo: string, texto: string) =>
    `<table class="rich-messages"><tr><td><span class="rich-messages-marker"><p class="texto">${tipo}. &nbsp;</p></span><span class="rich-messages-label">${texto}</span></td></tr></table>`;
  const html = painel('Sucesso', 'Opera&ccedil;&atilde;o realizada com sucesso.') + painel('Sucesso', 'Operação realizada com sucesso.')
    + painel('Alerta', 'Pode ser necessário gerar novamente as ocorrências.') + painel('Erro', 'Data inválida.');
  assert.deepEqual(lerMensagens(lerHtml(html)), [
    { tipo: 'sucesso', texto: 'Operação realizada com sucesso.' },
    { tipo: 'alerta', texto: 'Pode ser necessário gerar novamente as ocorrências.' },
    { tipo: 'erro', texto: 'Data inválida.' },
  ]);
});

test('idPorTexto: encontra link ou botão pelo texto visível', () => {
  const raiz = lerHtml('<a id="m1" href="#">Novo</a><a id="m2" href="#"> Importar </a><input id="b1" type="button" value="Liquidar">');
  assert.equal(idPorTexto(raiz, 'Importar'), 'm2');
  assert.equal(idPorTexto(raiz, 'Liquidar'), 'b1');
  assert.equal(idPorTexto(raiz, 'Exportar'), undefined);
});
