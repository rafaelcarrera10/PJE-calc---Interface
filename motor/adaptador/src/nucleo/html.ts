// Leitura das páginas JSF do PJe-Calc: campos do formulário (como o navegador os enviaria) e mensagens.
import { parse, type HTMLElement } from 'node-html-parser';

export type TipoMensagem = 'sucesso' | 'alerta' | 'erro';

export interface Mensagem {
  tipo: TipoMensagem;
  texto: string;
}

export interface Formulario {
  id: string;
  action: string;
  multipart: boolean;
  /** Pares nome/valor na ordem do documento, já filtrados como o navegador faria ao enviar. */
  campos: [string, string][];
}

export interface Pagina {
  url: string;
  raiz: HTMLElement;
  formulario: Formulario;
  mensagens: Mensagem[];
}

const TIPOS_SEM_VALOR = new Set(['submit', 'button', 'image', 'reset', 'file']);

export function lerHtml(html: string): HTMLElement {
  return parse(html, { comment: false, blockTextElements: { script: true, style: false } });
}

export function lerPagina(html: string, url: string, idFormulario = 'formulario'): Pagina {
  const raiz = lerHtml(html);
  const form = raiz.getElementById(idFormulario);
  if (!form) throw new Error(`Formulário "${idFormulario}" não encontrado em ${url}`);
  return {
    url,
    raiz,
    formulario: {
      id: idFormulario,
      action: form.getAttribute('action') ?? url,
      multipart: (form.getAttribute('enctype') ?? '').includes('multipart'),
      campos: camposDoFormulario(form),
    },
    mensagens: lerMensagens(raiz),
  };
}

/** Reproduz a serialização de formulários do navegador (HTML Living Standard, "constructing the entry list"). */
export function camposDoFormulario(form: HTMLElement): [string, string][] {
  const campos: [string, string][] = [];
  for (const el of form.querySelectorAll('input, select, textarea')) {
    const nome = el.getAttribute('name');
    if (!nome || el.hasAttribute('disabled')) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === 'select') {
      const opcoes = el.querySelectorAll('option');
      const selecionadas = opcoes.filter((o) => o.hasAttribute('selected'));
      const enviar = selecionadas.length ? selecionadas : el.hasAttribute('multiple') ? [] : opcoes.slice(0, 1);
      for (const o of enviar) campos.push([nome, o.getAttribute('value') ?? o.text]);
      continue;
    }
    if (tag === 'textarea') {
      campos.push([nome, el.text]);
      continue;
    }
    const tipo = (el.getAttribute('type') ?? 'text').toLowerCase();
    if (TIPOS_SEM_VALOR.has(tipo)) continue;
    const marcavel = tipo === 'checkbox' || tipo === 'radio';
    if (marcavel && !el.hasAttribute('checked')) continue;
    campos.push([nome, el.getAttribute('value') ?? (marcavel ? 'on' : '')]);
  }
  return campos;
}

export function lerMensagens(raiz: HTMLElement): Mensagem[] {
  // A página repete as mensagens em mais de um painel; cada uma entra uma única vez.
  const vistas = new Map<string, Mensagem>();
  for (const rotulo of raiz.querySelectorAll('.rich-messages-label')) {
    const marcador = rotulo.parentNode?.querySelector('.rich-messages-marker')?.text ?? '';
    const tipo: TipoMensagem = /erro/i.test(marcador) ? 'erro' : /alerta/i.test(marcador) ? 'alerta' : 'sucesso';
    const texto = normalizar(rotulo.text);
    if (texto) vistas.set(`${tipo}|${texto}`, { tipo, texto });
  }
  return [...vistas.values()];
}

/** Elemento clicável (link ou botão) pelo texto visível, ex.: item de menu "Liquidar". */
export function idPorTexto(raiz: HTMLElement, texto: string): string | undefined {
  const alvo = normalizar(texto);
  for (const el of raiz.querySelectorAll('a[id], input[id][type=button], input[id][type=submit]')) {
    const rotulo = el.tagName === 'A' ? el.text : el.getAttribute('value') ?? '';
    if (normalizar(rotulo) === alvo) return el.getAttribute('id');
  }
  return undefined;
}

/** Texto já decodificado pelo parser; `\s` também cobre o espaço não separável (&nbsp;). */
export function normalizar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}
