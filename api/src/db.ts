// Banco local (SQLite embutido no Node >= 22.13 — sem dependência nativa, funciona igual no Windows e no Mac).
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Banco = DatabaseSync;

const MIGRACOES: string[] = [
  // 1 — estrutura inicial
  `
  CREATE TABLE calculo (
    id            TEXT PRIMARY KEY,
    criado_em     TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    excluido_em   TEXT,
    versao_atual  INTEGER NOT NULL,
    status        TEXT NOT NULL DEFAULT 'rascunho'
  );
  CREATE TABLE versao (
    calculo_id    TEXT NOT NULL REFERENCES calculo(id),
    numero        INTEGER NOT NULL,
    especificacao TEXT NOT NULL,
    sha256        TEXT NOT NULL,
    criada_em     TEXT NOT NULL,
    origem        TEXT NOT NULL,
    validacao     TEXT,
    PRIMARY KEY (calculo_id, numero)
  );
  CREATE TABLE liquidacao (
    id                    TEXT PRIMARY KEY,
    calculo_id            TEXT NOT NULL REFERENCES calculo(id),
    versao                INTEGER NOT NULL,
    data_liquidacao       TEXT NOT NULL,
    status                TEXT NOT NULL,
    motor                 TEXT,
    resumo                TEXT,
    criada_em             TEXT NOT NULL
  );
  CREATE TABLE artefato (
    id             TEXT PRIMARY KEY,
    liquidacao_id  TEXT NOT NULL REFERENCES liquidacao(id),
    tipo           TEXT NOT NULL,
    caminho        TEXT NOT NULL,
    sha256         TEXT NOT NULL,
    tamanho        INTEGER NOT NULL
  );
  CREATE TABLE evento (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    em         TEXT NOT NULL,
    calculo_id TEXT,
    tipo       TEXT NOT NULL,
    detalhe    TEXT
  );
  `,
];

export function abrirBanco(pastaDados: string): Banco {
  let arquivo = ':memory:';
  if (pastaDados !== ':memory:') {
    fs.mkdirSync(pastaDados, { recursive: true });
    arquivo = path.join(pastaDados, 'pjecalc-facil.db');
  }
  const db = new DatabaseSync(arquivo);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec('CREATE TABLE IF NOT EXISTS _migracao (numero INTEGER PRIMARY KEY, aplicada_em TEXT NOT NULL)');
  const aplicadas = new Set(
    (db.prepare('SELECT numero FROM _migracao').all() as { numero: number }[]).map((r) => r.numero),
  );
  MIGRACOES.forEach((sql, i) => {
    const numero = i + 1;
    if (aplicadas.has(numero)) return;
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO _migracao (numero, aplicada_em) VALUES (?, ?)').run(numero, new Date().toISOString());
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  });
  return db;
}

export function registrarEvento(db: Banco, calculoId: string | null, tipo: string, detalhe?: unknown) {
  // Nunca gravar dados pessoais aqui (docs/08): só tipo, ids e metadados.
  db.prepare('INSERT INTO evento (em, calculo_id, tipo, detalhe) VALUES (?, ?, ?, ?)').run(
    new Date().toISOString(),
    calculoId,
    tipo,
    detalhe === undefined ? null : JSON.stringify(detalhe),
  );
}
