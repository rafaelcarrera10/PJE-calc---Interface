// Cálculos: especificações versionadas (cada alteração cria uma versão imutável) — docs/06-api/recursos.md
import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { registrarEvento, type Banco } from '../db.js';
import { ErroApi, naoEncontrado } from '../problemas.js';
import { resolverPadroes, validarEspecificacao, type ResultadoValidacao } from './validacao.js';

type Spec = Record<string, any>;

interface LinhaCalculo {
  id: string;
  criado_em: string;
  atualizado_em: string;
  versao_atual: number;
  status: string;
  especificacao: string;
  validacao: string | null;
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const etag = (versao: number) => `"v${versao}"`;

/** RFC 7386 — JSON Merge Patch: null apaga, objetos se mesclam, o resto substitui. */
export function aplicarMergePatch(alvo: unknown, patch: unknown): unknown {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const base: Record<string, unknown> =
    alvo && typeof alvo === 'object' && !Array.isArray(alvo) ? { ...(alvo as Record<string, unknown>) } : {};
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (v === null) delete base[k];
    else base[k] = aplicarMergePatch(base[k], v);
  }
  return base;
}

function conferirEspecificacaoMinima(spec: unknown): asserts spec is Spec {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new ErroApi(422, 'ESPECIFICACAO_INVALIDA', 'A especificação deve ser um objeto JSON');
  }
  if ((spec as Spec).versaoEspecificacao !== '1.0') {
    throw new ErroApi(422, 'ESPECIFICACAO_INVALIDA', 'Versão da especificação não suportada', 'Use "versaoEspecificacao": "1.0".', [
      { caminho: '/versaoEspecificacao', codigo: 'VALOR_NAO_PERMITIDO', mensagem: 'Use "1.0".', origem: 'api' },
    ]);
  }
}

function resumo(l: LinhaCalculo) {
  const spec = JSON.parse(l.especificacao) as Spec;
  return {
    id: l.id,
    numeroProcesso: spec.processo?.numero ?? null,
    regional: spec.processo?.regional ?? null,
    reclamante: spec.partes?.reclamante?.nome ?? null,
    reclamado: spec.partes?.reclamado?.nome ?? null,
    titulo: spec._titulo ?? null,
    quantidadeVerbas: Array.isArray(spec.verbas) ? spec.verbas.length : 0,
    status: l.status,
    versao: l.versao_atual,
    criadoEm: l.criado_em,
    atualizadoEm: l.atualizado_em,
  };
}

export function obterLinha(db: Banco, id: string): LinhaCalculo {
  const l = db.prepare(`
    SELECT c.id, c.criado_em, c.atualizado_em, c.versao_atual, c.status, v.especificacao, v.validacao
      FROM calculo c JOIN versao v ON v.calculo_id = c.id AND v.numero = c.versao_atual
     WHERE c.id = ? AND c.excluido_em IS NULL`).get(id) as LinhaCalculo | undefined;
  if (!l) throw naoEncontrado('Cálculo');
  return l;
}

function gravarVersao(db: Banco, id: string, numero: number, spec: Spec, origem: string) {
  const texto = JSON.stringify(spec);
  db.prepare('INSERT INTO versao (calculo_id, numero, especificacao, sha256, criada_em, origem) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, numero, texto, sha256(texto), new Date().toISOString(), origem);
}

function transacao<T>(db: Banco, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function criarCalculo(db: Banco, spec: Spec, origem = 'criacao') {
  const id = crypto.randomUUID();
  const agora = new Date().toISOString();
  transacao(db, () => {
    db.prepare('INSERT INTO calculo (id, criado_em, atualizado_em, versao_atual, status) VALUES (?, ?, ?, 1, ?)')
      .run(id, agora, agora, 'rascunho');
    gravarVersao(db, id, 1, spec, origem);
  });
  registrarEvento(db, id, 'calculo.criado', { origem });
  return obterLinha(db, id);
}

export function representar(l: LinhaCalculo, resolvida = false) {
  const spec = JSON.parse(l.especificacao) as Spec;
  return {
    ...resumo(l),
    especificacao: resolvida ? resolverPadroes(spec) : spec,
    ultimaValidacao: l.validacao ? (JSON.parse(l.validacao) as ResultadoValidacao) : null,
  };
}

export function registrarCalculos(app: FastifyInstance, db: Banco) {
  app.post('/v1/calculos', async (req, reply) => {
    const spec = req.body;
    conferirEspecificacaoMinima(spec);
    const l = criarCalculo(db, spec);
    reply.header('ETag', etag(l.versao_atual)).header('Location', `/v1/calculos/${l.id}`).status(201);
    return representar(l);
  });

  app.get('/v1/calculos', async (req) => {
    const { busca } = req.query as { busca?: string };
    const linhas = db.prepare(`
      SELECT c.id, c.criado_em, c.atualizado_em, c.versao_atual, c.status, v.especificacao, v.validacao
        FROM calculo c JOIN versao v ON v.calculo_id = c.id AND v.numero = c.versao_atual
       WHERE c.excluido_em IS NULL ORDER BY c.atualizado_em DESC`).all() as unknown as LinhaCalculo[];
    let itens = linhas.map(resumo);
    if (busca) {
      const t = busca.toLowerCase();
      itens = itens.filter((i) => [i.numeroProcesso, i.reclamante, i.reclamado, i.titulo].some((x) => x?.toLowerCase().includes(t)));
    }
    return { itens };
  });

  app.get('/v1/calculos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { resolvida } = req.query as { resolvida?: string };
    const l = obterLinha(db, id);
    reply.header('ETag', etag(l.versao_atual));
    return representar(l, resolvida === 'true');
  });

  app.patch('/v1/calculos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ifMatch = req.headers['if-match'];
    if (!ifMatch) throw new ErroApi(428, 'IF_MATCH_OBRIGATORIO', 'Envie o cabeçalho If-Match com a versão que você editou');
    const patch = req.body;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new ErroApi(400, 'REQUISICAO_INVALIDA', 'O corpo deve ser um JSON Merge Patch (objeto)');
    }
    const l = transacao(db, () => {
      const atual = obterLinha(db, id);
      if (ifMatch !== etag(atual.versao_atual)) {
        throw new ErroApi(409, 'VERSAO_DESATUALIZADA', 'O cálculo foi alterado em outro lugar',
          `Você editou a ${ifMatch} e a atual é ${etag(atual.versao_atual)}. Recarregue para continuar.`, undefined,
          { versaoAtual: atual.versao_atual });
      }
      const nova = aplicarMergePatch(JSON.parse(atual.especificacao), patch);
      conferirEspecificacaoMinima(nova);
      if (JSON.stringify(nova) === atual.especificacao) return atual; // nada mudou: não cria versão
      const numero = atual.versao_atual + 1;
      gravarVersao(db, id, numero, nova, 'edicao');
      db.prepare('UPDATE calculo SET versao_atual = ?, atualizado_em = ?, status = ? WHERE id = ?')
        .run(numero, new Date().toISOString(), 'rascunho', id);
      return obterLinha(db, id);
    });
    reply.header('ETag', etag(l.versao_atual));
    return representar(l);
  });

  app.delete('/v1/calculos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    obterLinha(db, id);
    db.prepare('UPDATE calculo SET excluido_em = ? WHERE id = ?').run(new Date().toISOString(), id);
    registrarEvento(db, id, 'calculo.excluido');
    return reply.status(204).send();
  });

  app.post('/v1/calculos/:id/duplicar', async (req, reply) => {
    const { id } = req.params as { id: string };
    const original = JSON.parse(obterLinha(db, id).especificacao) as Spec;
    original._titulo = `${original._titulo ?? original.processo?.numero ?? 'Cálculo'} (cópia)`;
    const l = criarCalculo(db, original, `duplicado:${id}`);
    reply.header('ETag', etag(l.versao_atual)).status(201);
    return representar(l);
  });

  app.get('/v1/calculos/:id/versoes', async (req) => {
    const { id } = req.params as { id: string };
    obterLinha(db, id);
    return db.prepare('SELECT numero, criada_em AS criadaEm, origem, sha256 FROM versao WHERE calculo_id = ? ORDER BY numero DESC').all(id);
  });

  app.get('/v1/calculos/:id/versoes/:numero', async (req) => {
    const { id, numero } = req.params as { id: string; numero: string };
    obterLinha(db, id);
    const v = db.prepare('SELECT numero, criada_em AS criadaEm, origem, sha256, especificacao FROM versao WHERE calculo_id = ? AND numero = ?')
      .get(id, Number(numero)) as { especificacao: string } | undefined;
    if (!v) throw naoEncontrado('Versão');
    return { ...v, especificacao: JSON.parse(v.especificacao) };
  });

  app.post('/v1/calculos/:id/validacoes', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { modo } = req.query as { modo?: string };
    if (modo === 'motor') {
      throw new ErroApi(503, 'MOTOR_INDISPONIVEL', 'O PJe-Calc ainda não está conectado',
        'A validação pelo próprio PJe-Calc chega na Fase 1 (adaptador). Use a validação rápida.');
    }
    const l = obterLinha(db, id);
    const resultado = validarEspecificacao(JSON.parse(l.especificacao));
    db.prepare('UPDATE versao SET validacao = ? WHERE calculo_id = ? AND numero = ?').run(JSON.stringify(resultado), id, l.versao_atual);
    db.prepare('UPDATE calculo SET status = ? WHERE id = ?').run(resultado.valido ? 'valido' : 'rascunho', id);
    reply.header('ETag', etag(l.versao_atual));
    return resultado;
  });
}
