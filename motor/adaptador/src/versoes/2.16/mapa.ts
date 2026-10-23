// Tudo o que é específico das telas do PJe-Calc 2.16 fica aqui; outras versões terão seu próprio mapa.
import type { FormatoRelatorio, IndicesAcumulados } from '../../dominio.js';
import type { ItemMenu } from '../../nucleo/telas.js';

export const PAGINAS = {
  principal: '/pjecalc/pages/principal.jsf',
} as const;

/** Itens de menu identificados pela classe CSS do link (os ids j_idNN mudam conforme o menu montado). */
export const MENU = {
  importar: { texto: 'Importar' },
  liquidar: { classe: 'menuImageLiquidar' },
  imprimir: { classe: 'menuImagePrint' },
  exportar: { classe: 'menuImageExport' },
  excluir: { classe: 'menuImageDelete' },
} satisfies Record<string, ItemMenu>;

export const CAMPOS = {
  importacao: {
    componenteUpload: 'formulario:arquivo',
    confirmar: 'formulario:confirmarImportacao',
  },
  calculo: { id: 'formulario:idCalculo' },
  liquidacao: {
    data: 'formulario:dataDeLiquidacaoInputDate',
    indicesAcumulados: 'formulario:indicesAcumulados',
    liquidar: 'formulario:liquidar',
  },
  relatorio: {
    formato: 'formulario:formatoSaida',
    imprimir: 'formulario:imprimirConsolidado',
  },
  exportacao: {
    nomeArquivo: 'formulario:nomeArquivo',
    exportar: 'formulario:exportar',
  },
} as const;

/** Rótulos das opções de "Acumular Índices de Correção" na tela de liquidação. */
export const ROTULOS_INDICES_ACUMULADOS: Record<IndicesAcumulados, string> = {
  MES_SUBSEQUENTE_AO_VENCIMENTO: 'A partir do mês subsequente ao vencimento das verbas',
  MES_DO_VENCIMENTO: 'A partir do mês de vencimento das verbas',
  MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO: 'A partir do mês subsequente ao vencimento das verbas mensais e a partir do mês de vencimento das verbas anuais e rescisórias',
};

/** Rótulos dos formatos na tela de relatório. */
export const ROTULOS_FORMATO: Record<FormatoRelatorio, string> = { pdf: 'PDF', html: 'HTML' };
