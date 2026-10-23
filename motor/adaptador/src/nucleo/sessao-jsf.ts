// Sessão HTTP com o PJe-Calc (JSF 1.2 + RichFaces/A4J 3.3), reproduzindo o que o navegador faz.
//
// Regras (docs/02-pjecalc-por-dentro e motor/adaptador/testes/gabaritos/README.md):
// - uma requisição por vez: chamadas simultâneas corrompem a conversa ("row is unavailable");
// - cada requisição envia o formulário inteiro, com o ViewState atual;
// - navegação via A4J responde "Ajax-Response: redirect" + Location;
// - downloads são um POST comum do formulário com o parâmetro do link, disparado por script na resposta A4J.
import path from 'node:path';
import { ErroAdaptador } from './erros.js';
import { lerHtml, lerMensagens, lerPagina, type Mensagem, type Pagina } from './html.js';
import { exigirSemErro } from './telas.js';

export interface Arquivo {
  nome: string;
  tipo: string;
  conteudo: Uint8Array;
}

/** Valor a definir num campo; `null` remove o campo do envio (ex.: desmarcar checkbox). */
export type Alteracoes = Record<string, string | null>;

export interface ResultadoAjax {
  /** Página atual depois da ação (nova, se houve navegação). */
  pagina: Pagina;
  mensagens: Mensagem[];
  /** Ações que a resposta pediu ao navegador via jsfcljs (ex.: link de download), com seus parâmetros. */
  acoes: Record<string, string>[];
}

export interface OpcoesSessao {
  /** Tempo limite de cada requisição (a liquidação de cálculos grandes pode levar minutos). */
  tempoLimiteMs?: number;
}

const VIEW_STATE = 'javax.faces.ViewState';

export class SessaoJsf {
  private readonly cookies = new Map<string, string>();
  private fila: Promise<unknown> = Promise.resolve();
  private readonly tempoLimiteMs: number;

  constructor(private readonly base: string, opcoes: OpcoesSessao = {}) {
    this.tempoLimiteMs = opcoes.tempoLimiteMs ?? 300_000;
  }

  /** GET de uma página do PJe-Calc (caminho relativo a /pjecalc ou absoluto a partir de /). */
  abrir(caminho: string): Promise<Pagina> {
    return this.emFila(() => this.abrirSemFila(caminho));
  }

  /** Clique num componente A4J (link, botão, checkbox com AJAX). */
  acionar(pagina: Pagina, idComponente: string, alteracoes: Alteracoes = {}): Promise<ResultadoAjax> {
    return this.emFila(async () => {
      const campos = aplicar(pagina.formulario.campos, alteracoes);
      // Como o A4J: os parâmetros do componente vão ao final, sem substituir um campo de mesmo nome (ex.: checkbox).
      const envio: [string, string][] = [...campos, ['AJAXREQUEST', '_viewRoot'], [idComponente, idComponente]];
      const resposta = await this.postar(pagina.formulario.action, envio);
      const destino = resposta.headers.get('location');
      if (resposta.headers.get('ajax-response') === 'redirect' && destino) {
        const nova = await this.abrirSemFila(destino);
        return { pagina: nova, mensagens: nova.mensagens, acoes: [] };
      }
      const xml = await lerTexto(resposta);
      if (resposta.status >= 400 || /LockTimeoutException|Erro Interno no Servidor/.test(xml)) {
        throw new ErroAdaptador('MOTOR_FALHOU', 'O PJe-Calc respondeu com erro interno', { componente: idComponente, status: resposta.status });
      }
      const viewState = /name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/.exec(xml)?.[1];
      const atualizada: Pagina = {
        ...pagina,
        formulario: { ...pagina.formulario, campos: viewState ? aplicar(campos, { [VIEW_STATE]: viewState }) : campos },
      };
      return { pagina: atualizada, mensagens: lerMensagens(lerHtml(xml)), acoes: lerAcoesJsfcljs(xml) };
    });
  }

  /**
   * Aciona um componente A4J que prepara um download (relatório, exportação) e baixa o arquivo: a resposta manda o
   * navegador reenviar o formulário com o parâmetro do link (jsfcljs), o que é reproduzido aqui.
   */
  async acionarEBaixar(pagina: Pagina, idComponente: string, alteracoes: Alteracoes = {}): Promise<{ arquivo: Arquivo; resultado: ResultadoAjax }> {
    const resultado = await this.acionar(pagina, idComponente, alteracoes);
    exigirSemErro(resultado.mensagens, idComponente);
    const acao = resultado.acoes.at(-1);
    if (!acao) throw new ErroAdaptador('RESPOSTA_INESPERADA', `O PJe-Calc não iniciou o download (${idComponente})`, { mensagens: resultado.mensagens });
    return { arquivo: await this.baixar(resultado.pagina, acao), resultado };
  }

  /**
   * Envia um arquivo por um componente rich:fileUpload junto com o envio do formulário (modo "form upload" do
   * RichFaces 3.3: uma única requisição multipart, sem o envio assíncrono em etapas).
   */
  enviarArquivo(pagina: Pagina, idComponenteUpload: string, arquivo: Arquivo, alteracoes: Alteracoes): Promise<Pagina> {
    const acao = pagina.formulario.action.split('?')[0];
    const url = `${acao}?_richfaces_upload_uid=_richfaces_form_upload&${idComponenteUpload}=${idComponenteUpload}&_richfaces_upload_file_indicator=true`;
    return this.submeter(pagina, alteracoes, { url, arquivos: { [`${idComponenteUpload}:file`]: arquivo } });
  }

  /** Envio comum (não AJAX) do formulário, com arquivos opcionais; segue o redirecionamento. */
  submeter(pagina: Pagina, alteracoes: Alteracoes, opcoes: { url?: string; arquivos?: Record<string, Arquivo> } = {}): Promise<Pagina> {
    return this.emFila(async () => {
      const resposta = await this.enviarFormulario(pagina, alteracoes, opcoes);
      const destino = resposta.headers.get('location');
      if (destino) return this.abrirSemFila(destino);
      return lerPagina(await lerTexto(resposta), resposta.url || pagina.url);
    });
  }

  /** Envio comum que devolve um arquivo (relatório, .PJC). */
  baixar(pagina: Pagina, alteracoes: Alteracoes): Promise<Arquivo> {
    return this.emFila(async () => {
      const resposta = await this.enviarFormulario(pagina, alteracoes, {});
      const disposicao = resposta.headers.get('content-disposition') ?? '';
      // Só o nome-base: o nome vem do servidor e é usado por quem grava o arquivo; "..\" ou caminhos não podem passar.
      const informado = /filename="?([^";]+)"?/.exec(disposicao)?.[1];
      const nome = informado && path.win32.basename(informado.trim());
      if (!nome || nome === '.' || nome === '..') {
        throw new ErroAdaptador('RESPOSTA_INESPERADA', 'O PJe-Calc não devolveu um arquivo', {
          tipo: resposta.headers.get('content-type'),
          mensagens: lerMensagens(lerHtml(await lerTexto(resposta))),
        });
      }
      return { nome, tipo: resposta.headers.get('content-type') ?? 'application/octet-stream', conteudo: new Uint8Array(await resposta.arrayBuffer()) };
    });
  }

  private async abrirSemFila(caminho: string): Promise<Pagina> {
    let url = this.resolver(caminho);
    for (let saltos = 0; saltos < 5; saltos++) {
      const resposta = await this.requisitar(url, { method: 'GET' });
      const destino = resposta.headers.get('location');
      if (destino && resposta.status >= 300 && resposta.status < 400) {
        url = this.resolver(destino);
        continue;
      }
      const html = await lerTexto(resposta);
      if (resposta.status >= 400 || /Erro Interno no Servidor/.test(html)) {
        throw new ErroAdaptador('MOTOR_FALHOU', `O PJe-Calc respondeu com erro ao abrir ${caminho}`, { status: resposta.status });
      }
      return lerPagina(html, url);
    }
    throw new ErroAdaptador('RESPOSTA_INESPERADA', `Redirecionamentos demais ao abrir ${caminho}`);
  }

  private async enviarFormulario(pagina: Pagina, alteracoes: Alteracoes, opcoes: { url?: string; arquivos?: Record<string, Arquivo> }): Promise<Response> {
    const campos = aplicar(pagina.formulario.campos, alteracoes);
    const url = opcoes.url ?? pagina.formulario.action;
    if (!pagina.formulario.multipart && !opcoes.arquivos) {
      return this.postar(url, campos);
    }
    const corpo = new FormData();
    for (const [nome, valor] of campos) corpo.append(nome, valor);
    for (const [nome, arquivo] of Object.entries(opcoes.arquivos ?? {})) {
      corpo.append(nome, new Blob([new Uint8Array(arquivo.conteudo)], { type: arquivo.tipo }), arquivo.nome);
    }
    return this.requisitar(url, { method: 'POST', body: corpo });
  }

  private postar(url: string, campos: [string, string][]): Promise<Response> {
    return this.requisitar(url, { method: 'POST', body: codificarLatin1(campos), tipo: 'application/x-www-form-urlencoded' });
  }

  private async requisitar(url: string, init: { method: string; body?: string | FormData; tipo?: string }): Promise<Response> {
    const cabecalhos: Record<string, string> = {};
    if (this.cookies.size) cabecalhos.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    if (init.tipo) cabecalhos['content-type'] = init.tipo;
    let resposta: Response;
    try {
      resposta = await fetch(this.resolver(url), {
        method: init.method,
        body: init.body,
        headers: cabecalhos,
        redirect: 'manual',
        signal: AbortSignal.timeout(this.tempoLimiteMs),
      });
    } catch (e) {
      const tempo = (e as Error).name === 'TimeoutError';
      throw new ErroAdaptador(tempo ? 'TEMPO_ESGOTADO' : 'MOTOR_INDISPONIVEL',
        tempo ? `O PJe-Calc não respondeu em ${this.tempoLimiteMs / 1000} s` : 'Não foi possível conectar ao PJe-Calc', { url, causa: String(e) });
    }
    for (const c of resposta.headers.getSetCookie()) {
      const [par] = c.split(';');
      const i = par?.indexOf('=') ?? -1;
      if (par && i > 0) this.cookies.set(par.slice(0, i).trim(), par.slice(i + 1).trim());
    }
    return resposta;
  }

  private resolver(caminho: string): string {
    return new URL(caminho, this.base).toString();
  }

  /** Garante uma requisição por vez nesta sessão, mesmo que o chamador dispare várias. */
  private emFila<T>(tarefa: () => Promise<T>): Promise<T> {
    const execucao = this.fila.then(tarefa, tarefa);
    this.fila = execucao.catch(() => undefined);
    return execucao;
  }
}

/**
 * Substitui (ou remove, com null) os campos pelo nome: o novo valor entra no lugar da primeira ocorrência e as demais
 * ocorrências do mesmo nome saem. Nomes ainda inexistentes são acrescentados ao final.
 */
export function aplicar(campos: [string, string][], alteracoes: Alteracoes): [string, string][] {
  const pendentes = new Set(Object.keys(alteracoes));
  const resultado: [string, string][] = [];
  for (const [nome, valor] of campos) {
    if (!Object.hasOwn(alteracoes, nome)) {
      resultado.push([nome, valor]);
    } else if (pendentes.delete(nome) && alteracoes[nome] !== null) {
      resultado.push([nome, alteracoes[nome]!]);
    }
  }
  for (const nome of pendentes) if (alteracoes[nome] !== null) resultado.push([nome, alteracoes[nome]!]);
  return resultado;
}

/** application/x-www-form-urlencoded em ISO-8859-1, a codificação das páginas do PJe-Calc. */
export function codificarLatin1(campos: [string, string][]): string {
  const codificar = (s: string) => {
    let saida = '';
    for (const ch of s) {
      const c = ch.codePointAt(0)!;
      if (/[A-Za-z0-9*\-._]/.test(ch)) saida += ch;
      else if (ch === ' ') saida += '+';
      else if (c <= 0xff) saida += `%${c.toString(16).toUpperCase().padStart(2, '0')}`;
      else saida += `%26%23${c}%3B`; // fora do Latin-1: referência numérica, como o navegador faz
    }
    return saida;
  };
  return campos.map(([n, v]) => `${codificar(n)}=${codificar(v)}`).join('&');
}

/** Lê as chamadas jsfcljs(form, {'param':'valor'}, alvo) que a resposta A4J manda o navegador executar. */
export function lerAcoesJsfcljs(xml: string): Record<string, string>[] {
  const acoes: Record<string, string>[] = [];
  for (const m of xml.matchAll(/jsfcljs\([^,]+,\s*\{([^}]*)\}/g)) {
    const parametros: Record<string, string> = {};
    for (const p of (m[1] ?? '').matchAll(/'([^']*)'\s*:\s*'([^']*)'/g)) parametros[p[1]!] = p[2]!;
    acoes.push(parametros);
  }
  return acoes;
}

async function lerTexto(resposta: Response): Promise<string> {
  const charset = /charset=([^;]+)/i.exec(resposta.headers.get('content-type') ?? '')?.[1]?.trim() ?? 'iso-8859-1';
  let decodificador: TextDecoder;
  try {
    decodificador = new TextDecoder(charset);
  } catch {
    decodificador = new TextDecoder('latin1'); // charset desconhecido: a codificação das páginas do PJe-Calc
  }
  return decodificador.decode(await resposta.arrayBuffer());
}
