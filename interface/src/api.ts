// Cliente da API local. Toda comunicação passa por aqui (nenhum cálculo é feito na interface).
import type {
  Calculo, CalculoResumo, Especificacao, EstadoMotor, Opcao, Problema, ResultadoValidacao, VerbaCatalogo,
} from './tipos';

export class ErroDaApi extends Error {
  constructor(public status: number, public problema: Problema) {
    super(problema.title);
  }
}

let sessaoPronta: Promise<void> | null = null;
/** Pede o cookie de sessão local (HttpOnly) uma vez por carregamento da página. */
function garantirSessao() {
  sessaoPronta ??= fetch('/v1/sessao', { credentials: 'same-origin' }).then(() => undefined);
  return sessaoPronta;
}

async function chamar<T>(metodo: string, url: string, corpo?: unknown, cabecalhos: Record<string, string> = {}): Promise<{ dados: T; etag: string | null }> {
  await garantirSessao();
  const r = await fetch(url, {
    method: metodo,
    credentials: 'same-origin',
    headers: { ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...cabecalhos },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  const etag = r.headers.get('ETag');
  if (r.status === 204) return { dados: undefined as T, etag };
  const tipo = r.headers.get('Content-Type') ?? '';
  const json = tipo.includes('json') ? await r.json() : { title: await r.text(), status: r.status, codigo: 'RESPOSTA_INESPERADA' };
  if (!r.ok) throw new ErroDaApi(r.status, json as Problema);
  return { dados: json as T, etag };
}

export const api = {
  listarCalculos: (busca = '') =>
    chamar<{ itens: CalculoResumo[] }>('GET', `/v1/calculos${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`).then((r) => r.dados.itens),
  criarCalculo: (spec: Especificacao) => chamar<Calculo>('POST', '/v1/calculos', spec),
  obterCalculo: (id: string) => chamar<Calculo>('GET', `/v1/calculos/${id}`),
  alterarCalculo: (id: string, patch: unknown, etag: string) =>
    chamar<Calculo>('PATCH', `/v1/calculos/${id}`, patch, { 'If-Match': etag, 'Content-Type': 'application/merge-patch+json' }),
  excluirCalculo: (id: string) => chamar<void>('DELETE', `/v1/calculos/${id}`),
  duplicarCalculo: (id: string) => chamar<Calculo>('POST', `/v1/calculos/${id}/duplicar`),
  validar: (id: string) => chamar<ResultadoValidacao>('POST', `/v1/calculos/${id}/validacoes`).then((r) => r.dados),
  liquidar: (id: string, dataLiquidacao: string) => chamar<unknown>('POST', `/v1/calculos/${id}/liquidacoes`, { dataLiquidacao }),
  versoes: (id: string) =>
    chamar<{ numero: number; criadaEm: string; origem: string }[]>('GET', `/v1/calculos/${id}/versoes`).then((r) => r.dados),
  catalogoVerbas: () =>
    chamar<{ provisorio: boolean; origem: string; versaoPjeCalc: string; verbas: VerbaCatalogo[] }>('GET', '/v1/catalogos/verbas').then((r) => r.dados),
  catalogo: (nome: string) => chamar<Opcao[]>('GET', `/v1/catalogos/${nome}`).then((r) => r.dados),
  motor: () => chamar<EstadoMotor>('GET', '/v1/saude/motor').then((r) => r.dados),
};
