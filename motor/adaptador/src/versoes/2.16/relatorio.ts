// Leitura do "Resumo do Cálculo" do relatório HTML do PJe-Calc 2.16 (valores em reais, como texto decimal "1234.56").
import type { ResumoCalculo } from '../../dominio.js';
import { lerHtml, normalizar } from '../../nucleo/html.js';

const INICIO_RESUMO = /Resumo do C(?:á|&aacute;)lculo/;
const FIM_RESUMO = /Crit(?:é|&eacute;)rio de C(?:á|&aacute;)lculo/;

const HONORARIOS = /^HONOR[ÁA]RIOS L[ÍI]QUIDOS PARA (.+)$/i;

const ROTULOS: [Exclude<keyof ResumoCalculo, 'verbas' | 'honorarios' | 'honorariosPorCredor'>, RegExp][] = [
  ['brutoReclamante', /^Bruto Devido ao Reclamante$/i],
  ['liquidoReclamante', /^L[ÍI]QUIDO DEVIDO AO RECLAMANTE$/i],
  ['contribuicaoSocial', /^CONTRIBUI[ÇC][ÃA]O SOCIAL SOBRE SAL[ÁA]RIOS DEVIDOS$/i],
  ['deducaoContribuicaoSocial', /^DEDU[ÇC][ÃA]O DE CONTRIBUI[ÇC][ÃA]O SOCIAL$/i],
  ['custas', /^CUSTAS JUDICIAIS DEVIDAS PELO RECLAMADO$/i],
  ['totalDevidoReclamado', /^Total Devido pelo Reclamado$/i],
  ['irpf', /^IRPF DEVIDO PELO RECLAMANTE$/i],
];

const NUMERO = /^\(?-?[\d.]+,\d{2}\)?$/;

/** "1.234,56" ou "(286,05)" → "1234.56" / "286.05" (o parêntese indica desconto; o sinal fica no rótulo). */
export function decimalDoRelatorio(texto: string): string {
  return texto.replace(/[()]/g, '').replace(/\./g, '').replace(',', '.');
}

/** Recebe os bytes do relatório: o PJe-Calc gera o HTML em UTF-8, embora o cabeçalho HTTP anuncie ISO-8859-1. */
export function lerResumo(relatorio: Uint8Array): ResumoCalculo {
  const linhas = linhasDeTexto(trechoDoResumo(new TextDecoder('utf-8').decode(relatorio)));
  const inicio = linhas.findIndex((l) => /^Resumo do C[áa]lculo$/i.test(l));
  if (inicio < 0) throw new Error('Relatório sem a seção "Resumo do Cálculo"');
  const fim = linhas.findIndex((l, i) => i > inicio && /^Crit[ée]rio de C[áa]lculo/i.test(l));
  const secao = linhas.slice(inicio, fim < 0 ? undefined : fim);

  const resumo: ResumoCalculo = { verbas: {} };
  // Tabela de verbas: descrição seguida de três números (corrigido, juros, total), até a linha de totais.
  const cabecalho = secao.findIndex((l) => l === 'Total');
  for (let i = cabecalho + 1; i + 3 < secao.length; ) {
    const [descricao, a, b, c] = secao.slice(i, i + 4) as [string, string, string, string];
    if (NUMERO.test(descricao) || ![a, b, c].every((x) => NUMERO.test(x))) break;
    resumo.verbas[descricao] = { corrigido: decimalDoRelatorio(a), juros: decimalDoRelatorio(b), total: decimalDoRelatorio(c) };
    i += 4;
  }
  for (let i = 0; i + 1 < secao.length; i++) {
    const valor = secao[i + 1]!;
    if (!NUMERO.test(valor)) continue;
    const credor = HONORARIOS.exec(secao[i]!)?.[1];
    if (credor) {
      resumo.honorariosPorCredor ??= {};
      resumo.honorariosPorCredor[credor] ??= decimalDoRelatorio(valor);
      continue;
    }
    const rotulo = ROTULOS.find(([, re]) => re.test(secao[i]!));
    if (rotulo && resumo[rotulo[0]] === undefined) resumo[rotulo[0]] = decimalDoRelatorio(valor);
  }
  if (resumo.honorariosPorCredor) resumo.honorarios = somar(Object.values(resumo.honorariosPorCredor));
  return resumo;
}

/** Soma em centavos inteiros, sem erro de ponto flutuante. */
function somar(valores: string[]): string {
  const centavos = valores.reduce((t, v) => t + BigInt(v.replace('.', '')), 0n);
  const sinal = centavos < 0n ? '-' : '';
  const abs = (centavos < 0n ? -centavos : centavos).toString().padStart(3, '0');
  return `${sinal}${abs.slice(0, -2)}.${abs.slice(-2)}`;
}

/**
 * Só o trecho entre "Resumo do Cálculo" e "Critério de Cálculo": o relatório completo chega a 3 MB e o resto não é
 * usado. Começa na linha de tabela que contém o título; sem os marcadores, devolve o documento inteiro.
 */
function trechoDoResumo(html: string): string {
  const inicio = html.search(INICIO_RESUMO);
  if (inicio < 0) return html;
  const fim = html.slice(inicio).search(FIM_RESUMO);
  const linha = html.lastIndexOf('<tr', inicio);
  return html.slice(linha < 0 ? inicio : linha, fim < 0 ? undefined : inicio + fim + 200);
}

function linhasDeTexto(html: string): string[] {
  const raiz = lerHtml(html);
  const linhas: string[] = [];
  for (const no of raiz.querySelectorAll('td, th, span, p, div, h1, h2, h3')) {
    if (no.childNodes.some((f) => f.nodeType === 1)) continue; // só folhas: evita repetir o texto dos contêineres
    const texto = normalizar(no.text);
    if (texto) linhas.push(texto);
  }
  return linhas;
}
