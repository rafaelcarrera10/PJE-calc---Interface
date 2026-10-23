// API pública do adaptador (usada pela API local e pela linha de comando). Nada aqui depende de uma versão do PJe-Calc.
export * from './dominio.js';
export { ErroAdaptador, type CodigoErroAdaptador } from './nucleo/erros.js';
export type { Mensagem } from './nucleo/html.js';
export type { Arquivo } from './nucleo/sessao-jsf.js';
export { InstanciaPjeCalc, configPadrao, type ConfigInstancia, type EstadoInstancia } from './runtime/instancia.js';
export { conectar, VERSOES_SUPORTADAS } from './versoes/index.js';
export { liquidarPjc, type ResultadoLiquidacao, type OpcoesLiquidacao } from './liquidacao.js';
