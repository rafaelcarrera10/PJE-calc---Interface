import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decimalDoRelatorio, lerResumo } from '../../src/versoes/2.16/relatorio.js';
import { dataBr } from '../../src/nucleo/telas.js';

// Trecho no formato do relatório HTML do PJe-Calc 2.16: tabela com células <span> em <td>.
const celulas = (...textos: string[]) => textos.map((t) => `<td><span>${t}</span></td>`).join('');
const RELATORIO = `<html><body><table>
<tr>${celulas('Resumo do Cálculo')}</tr>
<tr>${celulas('Descrição do Bruto Devido ao Reclamante', 'Valor Corrigido', 'Juros', 'Total')}</tr>
<tr>${celulas('13º SALÁRIO', '450,88', '66,12', '517,00')}</tr>
<tr>${celulas('FGTS 8%', '1.512,20', '80,71', '1.592,91')}</tr>
<tr>${celulas('1.963,08', '146,83', '2.109,91', 'Total')}</tr>
<tr>${celulas('LÍQUIDO DEVIDO AO RECLAMANTE', '1.823,42')}</tr>
<tr>${celulas('Bruto Devido ao Reclamante', '2.109,91')}</tr>
<tr>${celulas('DEDUÇÃO DE CONTRIBUIÇÃO SOCIAL', '(286,05)')}</tr>
<tr>${celulas('HONORÁRIOS LÍQUIDOS PARA ADVOGADA A', '1.000,10')}</tr>
<tr>${celulas('HONORÁRIOS LÍQUIDOS PARA PERITO B', '250,95')}</tr>
<tr>${celulas('Critério de Cálculo e Fundamentação Legal', 'Bruto Devido ao Reclamante', '9,99')}</tr>
</table></body></html>`;

test('resumo: verbas e totais do relatório, em decimal com ponto', () => {
  const r = lerResumo(new TextEncoder().encode(RELATORIO));
  assert.deepEqual(r.verbas, {
    '13º SALÁRIO': { corrigido: '450.88', juros: '66.12', total: '517.00' },
    'FGTS 8%': { corrigido: '1512.20', juros: '80.71', total: '1592.91' },
  });
  assert.equal(r.brutoReclamante, '2109.91', 'ignora o que vem depois da seção');
  assert.equal(r.liquidoReclamante, '1823.42');
  assert.equal(r.deducaoContribuicaoSocial, '286.05');
  assert.deepEqual(r.honorariosPorCredor, { 'ADVOGADA A': '1000.10', 'PERITO B': '250.95' });
  assert.equal(r.honorarios, '1251.05', 'soma de todos os credores');
});

test('resumo: relatório sem a seção é recusado', () => {
  assert.throws(() => lerResumo(new TextEncoder().encode('<p>outro</p>')), /Resumo do Cálculo/);
});

test('formatos: decimal do relatório e data brasileira', () => {
  assert.equal(decimalDoRelatorio('(1.286,05)'), '1286.05');
  assert.equal(dataBr('2026-10-31'), '31/10/2026');
  assert.throws(() => dataBr('31/10/2026'), RangeError);
});
