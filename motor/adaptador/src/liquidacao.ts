// Caso de uso: liquidar um .PJC na instância dedicada e devolver os artefatos oficiais (sequência do README, passos 2–7).
import type { IndicesAcumulados, OperadorPjeCalc, ResumoCalculo } from './dominio.js';
import type { Mensagem } from './nucleo/html.js';
import type { Arquivo } from './nucleo/sessao-jsf.js';

export interface ResultadoLiquidacao {
  versaoPjeCalc: string;
  dataLiquidacao: string;
  mensagens: Mensagem[];
  resumo: ResumoCalculo;
  pdf: Arquivo;
  html: Arquivo;
  pjc: Arquivo;
  duracaoMs: number;
}

export interface OpcoesLiquidacao {
  data: string;
  indicesAcumulados?: IndicesAcumulados;
}

/** Importa, liquida, emite os relatórios e exporta; o cálculo é sempre excluído da instância ao final. */
export async function liquidarPjc(operador: OperadorPjeCalc, entrada: Arquivo, opcoes: OpcoesLiquidacao): Promise<ResultadoLiquidacao> {
  const inicio = Date.now();
  const calculo = await operador.importar(entrada);
  let resultado: ResultadoLiquidacao;
  try {
    const mensagens = await calculo.liquidar(opcoes.data, opcoes.indicesAcumulados);
    const html = await calculo.relatorio('html');
    const pdf = await calculo.relatorio('pdf');
    const pjc = await calculo.exportar();
    resultado = {
      versaoPjeCalc: operador.versao,
      dataLiquidacao: opcoes.data,
      mensagens,
      resumo: operador.lerResumo(html.conteudo),
      pdf,
      html,
      pjc,
      duracaoMs: Date.now() - inicio,
    };
  } catch (erro) {
    // A falha original é a que explica o problema; uma falha ao excluir depois dela não pode escondê-la.
    await calculo.excluir().catch(() => undefined);
    throw erro;
  }
  await calculo.excluir();
  return resultado;
}
