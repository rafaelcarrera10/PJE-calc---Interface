// Contrato do adaptador, independente da versão do PJe-Calc. Cada pasta em versoes/ implementa estas interfaces.
import type { Mensagem } from './nucleo/html.js';
import type { Arquivo } from './nucleo/sessao-jsf.js';

export type FormatoRelatorio = 'pdf' | 'html';

/** Opções de "Acumular Índices de Correção" da tela de liquidação. */
export const INDICES_ACUMULADOS = ['MES_SUBSEQUENTE_AO_VENCIMENTO', 'MES_DO_VENCIMENTO', 'MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO'] as const;
export type IndicesAcumulados = (typeof INDICES_ACUMULADOS)[number];

export interface ValorVerba {
  corrigido: string;
  juros: string;
  total: string;
}

/** "Resumo do Cálculo" do relatório; valores em reais como texto decimal ("1234.56"). */
export interface ResumoCalculo {
  verbas: Record<string, ValorVerba>;
  brutoReclamante?: string;
  liquidoReclamante?: string;
  contribuicaoSocial?: string;
  deducaoContribuicaoSocial?: string;
  /** Soma dos honorários líquidos de todos os credores; o detalhe fica em honorariosPorCredor. */
  honorarios?: string;
  honorariosPorCredor?: Record<string, string>;
  custas?: string;
  totalDevidoReclamado?: string;
  irpf?: string;
}

export interface OperadorPjeCalc {
  readonly versao: string;
  /** Importa um .PJC e devolve o cálculo aberto numa conversa própria. */
  importar(pjc: Arquivo): Promise<CalculoPjeCalc>;
  /** Lê o resumo do relatório HTML emitido por esta versão. */
  lerResumo(relatorioHtml: Uint8Array): ResumoCalculo;
}

export interface CalculoPjeCalc {
  readonly id: number;
  /** Liquida na data informada (AAAA-MM-DD). Pendências do PJe-Calc viram OPERACAO_RECUSADA. */
  liquidar(data: string, indices?: IndicesAcumulados): Promise<Mensagem[]>;
  relatorio(formato: FormatoRelatorio): Promise<Arquivo>;
  exportar(nomeArquivo?: string): Promise<Arquivo>;
  /** Remove o cálculo da instância dedicada. */
  excluir(): Promise<void>;
}
