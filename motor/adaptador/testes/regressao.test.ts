// Regressão contra o PJe-Calc real: cada gabarito é importado, liquidado e conferido ao centavo.
// Rodar com: npm run test:regressao -w motor/adaptador (requer a cópia dedicada; ver motor/runtime/README.md).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { InstanciaPjeCalc, conferirInstalacao } from '../src/runtime/instancia.js';
import { conectar } from '../src/versoes/index.js';
import { liquidarPjc } from '../src/liquidacao.js';
import type { ResumoCalculo } from '../src/dominio.js';

const pasta = path.join(path.dirname(fileURLToPath(import.meta.url)), 'gabaritos');
const esperados = JSON.parse(fs.readFileSync(path.join(pasta, 'valores-esperados.json'), 'utf8')) as {
  gabaritos: ({ arquivo: string; dataLiquidacao: string } & Record<string, unknown>)[];
};

/** Campos de valores-esperados.json que descrevem o gabarito, não valores do resumo. */
const METADADOS = new Set(['arquivo', 'processo', 'especificacao', 'dataLiquidacao']);

const instancia = new InstanciaPjeCalc();
let iniciadaPeloTeste = false;
let motivoParaPular: string | undefined;

before(async () => {
  if (!(await instancia.respondendo())) {
    try {
      conferirInstalacao(instancia.config);
    } catch (e) {
      motivoParaPular = `cópia dedicada do PJe-Calc indisponível: ${(e as Error).message}`;
      return;
    }
    await instancia.iniciar();
    iniciadaPeloTeste = true;
  }
});

after(async () => {
  if (iniciadaPeloTeste) await instancia.parar();
});

for (const g of esperados.gabaritos) {
  test(`gabarito ${g.arquivo}: liquidação confere ao centavo`, { timeout: 600_000 }, async (t) => {
    if (motivoParaPular) return t.skip(motivoParaPular);
    const operador = await conectar(instancia.url);
    const conteudo = fs.readFileSync(path.join(pasta, `${g.arquivo}.PJC`));
    const r = await liquidarPjc(operador, { nome: `${g.arquivo}.PJC`, tipo: 'application/octet-stream', conteudo }, { data: g.dataLiquidacao });

    // Todo valor esperado tem de existir no resumo lido: um campo que o leitor deixou de ler é falha, não omissão.
    for (const [campo, valor] of Object.entries(g)) {
      if (!METADADOS.has(campo)) assert.deepEqual(r.resumo[campo as keyof ResumoCalculo], valor, campo);
    }
    assert.equal(String.fromCharCode(...r.pdf.conteudo.slice(0, 5)), '%PDF-');
    assert.equal(String.fromCharCode(...r.pjc.conteudo.slice(0, 2)), 'PK', '.PJC é um zip');
  });
}
