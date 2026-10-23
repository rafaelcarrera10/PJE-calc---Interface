// Validação "rápida" (sem PJe-Calc): camada 1 = JSON Schema; camada 2 = regras de consistência.
// docs/06-api/especificacao-de-calculo.md — "Regras de validação (camadas)".
import fs from 'node:fs';
import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';
import type { ItemErro } from '../problemas.js';
import { catalogoVerbas } from './catalogos.js';

// ajv-formats é CommonJS: o default pode vir aninhado conforme o carregador.
const addFormats = ((addFormatsImport as unknown as { default?: unknown }).default ?? addFormatsImport) as (a: Ajv2020) => void;

export interface ResultadoValidacao {
  valido: boolean;
  erros: ItemErro[];
  avisos: ItemErro[];
  validadoEm: string;
}

type Spec = Record<string, any>;

let validar: ValidateFunction | null = null;
let aplicarPadroes: ValidateFunction | null = null;

export function carregarSchema(caminho: string) {
  const schema = JSON.parse(fs.readFileSync(caminho, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  validar = ajv.compile(schema);
  const ajvPadroes = new Ajv2020({ allErrors: true, strict: false, useDefaults: true });
  addFormats(ajvPadroes);
  aplicarPadroes = ajvPadroes.compile(schema);
}

/** Devolve uma cópia com os padrões do schema preenchidos (GET ?resolvida=true). */
export function resolverPadroes(spec: Spec): Spec {
  const copia = structuredClone(spec);
  aplicarPadroes?.(copia);
  return copia;
}

const ROTULOS: Record<string, string> = {
  versaoEspecificacao: 'versão da especificação', processo: 'processo', numero: 'número do processo', regional: 'TRT',
  contrato: 'contrato', admissao: 'data de admissão', demissao: 'data de demissão', ajuizamento: 'data do ajuizamento',
  nome: 'nome', periodos: 'períodos', de: 'competência inicial', ate: 'competência final', valor: 'valor',
  inicio: 'início', fim: 'fim', aquisitivo: 'período aquisitivo', devedor: 'devedor', percentual: 'percentual',
  aPartirDe: 'data inicial', indice: 'índice', catalogo: 'verba', cpf: 'CPF', cnpj: 'CNPJ', uf: 'UF', modo: 'modo',
};
const rotulo = (k: string) => ROTULOS[k] ?? k;
const ultimo = (p: string) => p.split('/').filter(Boolean).pop() ?? '';

function traduzir(e: ErrorObject): ItemErro | null {
  const p = e.instancePath;
  const base = { origem: 'api' as const };
  switch (e.keyword) {
    case 'required': {
      const campo = (e.params as { missingProperty: string }).missingProperty;
      return { ...base, caminho: `${p}/${campo}`, codigo: 'OBRIGATORIO', mensagem: `Preencha: ${rotulo(campo)}.` };
    }
    case 'additionalProperties': {
      const campo = (e.params as { additionalProperty: string }).additionalProperty;
      return { ...base, caminho: `${p}/${campo}`, codigo: 'CAMPO_DESCONHECIDO', mensagem: `Campo não reconhecido: "${campo}".` };
    }
    case 'format': {
      const f = (e.params as { format: string }).format;
      const msg = f === 'date' ? 'Data inválida (use o seletor de data).' : `Formato inválido (${f}).`;
      return { ...base, caminho: p, codigo: 'FORMATO_INVALIDO', mensagem: `${capital(rotulo(ultimo(p)))}: ${msg}` };
    }
    case 'pattern':
      return { ...base, caminho: p, codigo: 'FORMATO_INVALIDO', mensagem: `${capital(rotulo(ultimo(p)))}: formato inválido.` };
    case 'enum':
    case 'const':
      return { ...base, caminho: p, codigo: 'VALOR_NAO_PERMITIDO', mensagem: `${capital(rotulo(ultimo(p)))}: escolha uma das opções.` };
    case 'type':
      return { ...base, caminho: p, codigo: 'TIPO_INVALIDO', mensagem: `${capital(rotulo(ultimo(p)))}: tipo de valor inválido.` };
    case 'minimum':
    case 'maximum':
    case 'minItems':
    case 'maxItems':
      return { ...base, caminho: p, codigo: 'FORA_DO_LIMITE', mensagem: `${capital(rotulo(ultimo(p)))}: ${e.message}.` };
    case 'oneOf':
      if (/^\/verbas\/\d+$/.test(p)) {
        return { ...base, caminho: `${p}/catalogo`, codigo: 'VERBA_INDEFINIDA', mensagem: 'Escolha uma verba do catálogo ou crie uma verba personalizada.' };
      }
      return null;
    default:
      return { ...base, caminho: p || '/', codigo: 'INVALIDO', mensagem: e.message ?? 'Valor inválido.' };
  }
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function errosDoSchema(spec: Spec): ItemErro[] {
  if (!validar) throw new Error('Schema não carregado');
  if (validar(spec)) return [];
  const brutos = validar.errors ?? [];
  const caminhosOneOf = new Set(brutos.filter((e) => e.keyword === 'oneOf').map((e) => e.instancePath));
  const itens: ItemErro[] = [];
  const vistos = new Set<string>();
  for (const e of brutos) {
    // Ruído do oneOf (catalogo × personalizada) — substituído por uma mensagem só.
    if (caminhosOneOf.has(e.instancePath) && e.keyword === 'required') continue;
    if (e.instancePath.startsWith('/cartaoDePonto') && e.keyword !== 'oneOf' && caminhosOneOf.has('/cartaoDePonto')) continue;
    const t = traduzir(e);
    if (!t) continue;
    const chave = `${t.caminho}|${t.codigo}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    itens.push(t);
  }
  return itens;
}

// ---------------------------------------------------------------------------------------------
// Camada 2 — consistência
// ---------------------------------------------------------------------------------------------

const ehData = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const ehComp = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s);
const mesDe = (d: string) => d.slice(0, 7);
function somarAnos(d: string, anos: number) {
  const [a, m, dia] = d.split('-').map(Number);
  return `${String(a + anos).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
function mesesEntre(de: string, ate: string): string[] {
  const out: string[] = [];
  let [a, m] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  let guarda = 0;
  while ((a < a2 || (a === a2 && m <= m2)) && guarda++ < 1200) {
    out.push(`${a}-${String(m).padStart(2, '0')}`);
    m++; if (m > 12) { m = 1; a++; }
  }
  return out;
}

/** Dígito verificador do número CNJ (Res. CNJ 65/2008): módulo 97, ISO 7064. */
export function cnjValido(numero: string): boolean {
  const m = numero.match(/^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$/);
  if (!m) return false;
  const [, n, dv, ano, j, tr, orig] = m;
  const resto = BigInt(`${n}${ano}${j}${tr}${orig}00`) % 97n;
  return 98n - resto === BigInt(dv);
}

export function regrasDeConsistencia(spec: Spec): { erros: ItemErro[]; avisos: ItemErro[] } {
  const erros: ItemErro[] = [];
  const avisos: ItemErro[] = [];
  const erro = (caminho: string, codigo: string, mensagem: string) => erros.push({ caminho, codigo, mensagem, origem: 'api' });
  const aviso = (caminho: string, codigo: string, mensagem: string) => avisos.push({ caminho, codigo, mensagem, origem: 'api' });

  const c = spec.contrato ?? {};
  const adm = ehData(c.admissao) ? c.admissao : null;
  const dem = ehData(c.demissao) ? c.demissao : null;
  const ajz = ehData(c.ajuizamento) ? c.ajuizamento : null;

  // Processo
  const num = spec.processo?.numero;
  if (typeof num === 'string' && /^\d{7}-\d{2}\.\d{4}\.5\.\d{2}\.\d{4}$/.test(num)) {
    if (!cnjValido(num)) erro('/processo/numero', 'CNJ_DV_INVALIDO', 'O dígito verificador do número do processo não confere. Confira a digitação.');
    const trNum = Number(num.split('.')[3]);
    const reg = spec.processo?.regional;
    if (typeof reg === 'string' && /^TRT\d+$/.test(reg) && Number(reg.slice(3)) !== trNum) {
      aviso('/processo/regional', 'TRT_DIFERENTE_DO_NUMERO', `O número do processo indica o TRT${trNum}, mas foi escolhido o ${reg}.`);
    }
  }

  // Contrato
  if (adm && dem && dem < adm) erro('/contrato/demissao', 'DEMISSAO_ANTES_ADMISSAO', 'A demissão não pode ser anterior à admissão.');
  if (adm && ajz && ajz < adm) erro('/contrato/ajuizamento', 'AJUIZAMENTO_ANTES_ADMISSAO', 'O ajuizamento não pode ser anterior à admissão.');
  if (dem && ajz && ajz > somarAnos(dem, 2)) {
    aviso('/contrato/ajuizamento', 'PRESCRICAO_BIENAL', 'A ação foi ajuizada mais de 2 anos após a demissão (prescrição bienal, art. 7º, XXIX, CF). Confira.');
  }
  if (!dem && c.tipoRescisao && c.tipoRescisao !== 'vigente') {
    aviso('/contrato/demissao', 'DEMISSAO_AUSENTE', 'Informe a data de demissão (o tipo de rescisão indica contrato encerrado).');
  }

  const pc = spec.parametros?.periodoCalculo;
  if (pc && ehData(pc.inicio) && ehData(pc.fim) && pc.inicio > pc.fim) {
    erro('/parametros/periodoCalculo/fim', 'PERIODO_INVERTIDO', 'O fim do período do cálculo é anterior ao início.');
  }

  // Histórico salarial
  const historicos: Spec[] = Array.isArray(spec.historicoSalarial) ? spec.historicoSalarial : [];
  const mesesPorHistorico = new Map<string, Set<string>>();
  historicos.forEach((h, i) => {
    const meses = new Set<string>();
    (Array.isArray(h.periodos) ? h.periodos : []).forEach((p: Spec, j: number) => {
      if (!ehComp(p.de) || !ehComp(p.ate)) return;
      if (p.de > p.ate) { erro(`/historicoSalarial/${i}/periodos/${j}/ate`, 'PERIODO_INVERTIDO', 'A competência final é anterior à inicial.'); return; }
      for (const mes of mesesEntre(p.de, p.ate)) {
        if (meses.has(mes)) { aviso(`/historicoSalarial/${i}/periodos/${j}/de`, 'PERIODO_SOBREPOSTO', `Há mais de um valor para ${mes.split('-').reverse().join('/')} em "${h.nome}".`); break; }
        meses.add(mes);
      }
    });
    if (typeof h.nome === 'string') mesesPorHistorico.set(h.nome, meses);
  });

  // Verbas
  const verbas: Spec[] = Array.isArray(spec.verbas) ? spec.verbas : [];
  if (verbas.length === 0) aviso('/verbas', 'SEM_VERBAS', 'Nenhuma verba foi incluída. O cálculo ficará zerado.');
  const catalogo = new Map(catalogoVerbas().verbas.map((v) => [v.nome, v]));
  const prescricaoQuinquenal = spec.parametros?.prescricao?.quinquenal !== false;
  verbas.forEach((v, i) => {
    const raiz = `/verbas/${i}`;
    const p = v.periodo;
    if (p && ehData(p.inicio) && ehData(p.fim)) {
      if (p.inicio > p.fim) erro(`${raiz}/periodo/fim`, 'PERIODO_INVERTIDO', 'O fim do período da verba é anterior ao início.');
      if (adm && p.inicio < adm) erro(`${raiz}/periodo/inicio`, 'PERIODO_FORA_DO_CONTRATO', 'O período da verba começa antes da admissão.');
      if (dem && p.fim > dem) aviso(`${raiz}/periodo/fim`, 'PERIODO_APOS_DEMISSAO', 'O período da verba termina depois da demissão (correto só se houver projeção do aviso prévio).');
      if (prescricaoQuinquenal && ajz && p.inicio < somarAnos(ajz, -5)) {
        aviso(`${raiz}/periodo/inicio`, 'PERIODO_PRESCRITO', 'Parte do período é anterior aos 5 anos do ajuizamento (prescrição quinquenal). O PJe-Calc desconsidera essa parte.');
      }
    } else if (v.catalogo || v.personalizada) {
      aviso(`${raiz}/periodo`, 'PERIODO_AUSENTE', 'Sem período informado: o PJe-Calc usará o período do cálculo.');
    }
    if (typeof v.catalogo === 'string' && v.catalogo) {
      const item = catalogo.get(v.catalogo);
      if (!item) {
        aviso(`${raiz}/catalogo`, 'VERBA_FORA_DO_CATALOGO', `"${v.catalogo}" não está no catálogo provisório. Será conferida quando o motor estiver conectado.`);
      } else if (Array.isArray(v.reflexos)) {
        v.reflexos.forEach((r: Spec, k: number) => {
          if (r?.catalogo && !item.reflexosDisponiveis.includes(r.catalogo)) {
            aviso(`${raiz}/reflexos/${k}/catalogo`, 'REFLEXO_NAO_PADRAO', `"${r.catalogo}" não é reflexo padrão de "${v.catalogo}" no PJe-Calc.`);
          }
        });
      }
    }
    if (v.base?.tipo === 'historico_salarial') {
      const nomes: string[] = Array.isArray(v.base.historicos) ? v.base.historicos : [];
      if (nomes.length === 0) erro(`${raiz}/base/historicos`, 'BASE_SEM_HISTORICO', 'Escolha qual histórico salarial serve de base.');
      nomes.forEach((n, k) => {
        const meses = mesesPorHistorico.get(n);
        if (!meses) { erro(`${raiz}/base/historicos/${k}`, 'HISTORICO_INEXISTENTE', `Não existe histórico salarial chamado "${n}".`); return; }
        if (p && ehData(p.inicio) && ehData(p.fim) && p.inicio <= p.fim) {
          const faltando = mesesEntre(mesDe(p.inicio), mesDe(p.fim)).filter((m) => !meses.has(m));
          if (faltando.length) {
            const ex = faltando.slice(0, 3).map((m) => m.split('-').reverse().join('/')).join(', ');
            aviso(`${raiz}/base/historicos/${k}`, 'HISTORICO_INCOMPLETO', `"${n}" não tem valor em ${faltando.length} mês(es) do período da verba (ex.: ${ex}).`);
          }
        }
      });
    }
    if (v.base?.tipo === 'valor_informado' && !v.base.valor) erro(`${raiz}/base/valor`, 'OBRIGATORIO', 'Informe o valor da base.');
  });

  // Faltas e férias
  (Array.isArray(spec.faltas) ? spec.faltas : []).forEach((f: Spec, i: number) => {
    if (ehData(f.inicio) && ehData(f.fim) && f.inicio > f.fim) erro(`/faltas/${i}/fim`, 'PERIODO_INVERTIDO', 'O fim da falta é anterior ao início.');
  });
  (Array.isArray(spec.ferias) ? spec.ferias : []).forEach((f: Spec, i: number) => {
    const a = f.aquisitivo;
    if (a && ehData(a.inicio) && ehData(a.fim) && a.inicio > a.fim) erro(`/ferias/${i}/aquisitivo/fim`, 'PERIODO_INVERTIDO', 'O fim do período aquisitivo é anterior ao início.');
  });

  // Honorários
  (Array.isArray(spec.honorarios) ? spec.honorarios : []).forEach((h: Spec, i: number) => {
    const pct = Number(h.percentual);
    if (h.percentual !== undefined && (Number.isNaN(pct) || pct <= 0 || pct > 100)) erro(`/honorarios/${i}/percentual`, 'PERCENTUAL_INVALIDO', 'O percentual deve estar entre 0 e 100.');
    else if (pct > 20) aviso(`/honorarios/${i}/percentual`, 'PERCENTUAL_ALTO', 'Honorários de sucumbência na JT costumam ficar entre 5% e 15% (art. 791-A, CLT). Confira.');
    if (h.base === 'valor_informado' && !h.valorInformado) erro(`/honorarios/${i}/valorInformado`, 'OBRIGATORIO', 'Informe o valor dos honorários.');
  });

  // Correção e juros
  const comb: Spec[] = Array.isArray(spec.correcaoJurosMulta?.combinacao) ? spec.correcaoJurosMulta.combinacao : [];
  if (comb.length === 0) aviso('/correcaoJurosMulta/combinacao', 'SEM_CORRECAO', 'Nenhum índice de correção definido: o PJe-Calc usará o padrão dele.');
  for (let i = 1; i < comb.length; i++) {
    if (ehData(comb[i].aPartirDe) && ehData(comb[i - 1].aPartirDe) && comb[i].aPartirDe <= comb[i - 1].aPartirDe) {
      erro(`/correcaoJurosMulta/combinacao/${i}/aPartirDe`, 'ORDEM_INVALIDA', 'As datas da combinação de índices devem estar em ordem crescente.');
    }
  }

  return { erros, avisos };
}

export function validarEspecificacao(spec: Spec): ResultadoValidacao {
  const doSchema = errosDoSchema(spec);
  const { erros, avisos } = regrasDeConsistencia(spec);
  const todos = [...doSchema, ...erros];
  return { valido: todos.length === 0, erros: todos, avisos, validadoEm: new Date().toISOString() };
}
