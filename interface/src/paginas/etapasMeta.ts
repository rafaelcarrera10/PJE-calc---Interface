// Metadados das etapas (sem componentes, para evitar importação circular).
export interface EtapaMeta {
  chave: string;
  titulo: string;
  resumo: string;
  prefixos: string[];
}

export const ETAPAS: EtapaMeta[] = [
  { chave: 'processo', titulo: 'Processo e partes', resumo: 'Número, TRT e quem são as partes', prefixos: ['/processo', '/partes', '/_titulo'] },
  { chave: 'contrato', titulo: 'Contrato', resumo: 'Datas, rescisão e aviso prévio', prefixos: ['/contrato'] },
  { chave: 'parametros', titulo: 'Local e jornada', resumo: 'Feriados, carga horária, prescrição', prefixos: ['/parametros'] },
  { chave: 'salarios', titulo: 'Salários', resumo: 'Quanto ganhava, mês a mês', prefixos: ['/historicoSalarial'] },
  { chave: 'verbas', titulo: 'Verbas deferidas', resumo: 'O que a sentença mandou pagar', prefixos: ['/verbas'] },
  { chave: 'ausencias', titulo: 'Faltas e férias', resumo: 'Opcional', prefixos: ['/faltas', '/ferias', '/cartaoDePonto'] },
  { chave: 'encargos', titulo: 'FGTS, IR e honorários', resumo: 'Encargos e honorários', prefixos: ['/fgts', '/impostoDeRenda', '/honorarios', '/contribuicaoSocial', '/multas', '/custas'] },
  { chave: 'correcao', titulo: 'Correção e juros', resumo: 'Índices por período', prefixos: ['/correcaoJurosMulta'] },
  { chave: 'revisao', titulo: 'Revisão', resumo: 'Tudo numa página + pendências', prefixos: [] },
  { chave: 'resultado', titulo: 'Liquidar', resumo: 'Enviar ao PJe-Calc', prefixos: ['/dataLiquidacao'] },
];

export const etapaDoCaminho = (caminho: string) =>
  ETAPAS.find((e) => e.prefixos.some((p) => caminho === p || caminho.startsWith(`${p}/`)))?.chave ?? 'revisao';

export const tituloDaEtapa = (chave: string) => ETAPAS.find((e) => e.chave === chave)?.titulo ?? chave;
