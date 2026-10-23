// Tipos da especificação de cálculo (espelham contratos/schemas/especificacao-calculo.schema.json).
// Valores monetários e decimais são STRINGS com ponto ("3500.00"); datas ISO; competências "AAAA-MM".

export type Data = string;
export type Competencia = string;
export type Decimal = string;

export interface Incidencias {
  fgts?: boolean;
  inss?: boolean;
  irpf?: boolean;
  previdenciaPrivada?: boolean;
  pensaoAlimenticia?: boolean;
}

export interface Periodo {
  inicio: Data;
  fim: Data;
}

export interface Parte {
  nome: string;
  cpf?: string;
  cnpj?: string;
}

export interface PeriodoSalarial {
  de: Competencia;
  ate: Competencia;
  valor: Decimal;
  fgtsRecolhido?: boolean;
  inssRecolhido?: boolean;
}

export interface HistoricoSalarial {
  nome: string;
  incidencias?: Incidencias;
  periodos: PeriodoSalarial[];
}

export interface Reflexo {
  catalogo: string;
}

export interface Verba {
  catalogo?: string;
  descricao?: string;
  periodo?: Periodo;
  base?: { tipo?: string; historicos?: string[]; valor?: Decimal };
  divisor?: { tipo?: string; valor?: Decimal };
  multiplicador?: Decimal;
  quantidade?: { tipo?: string; valor?: Decimal; coluna?: string };
  incidencias?: Incidencias;
  reflexos?: Reflexo[];
  _fonte?: string;
}

export interface Honorario {
  devedor: 'reclamado' | 'reclamante';
  percentual: Decimal;
  base?: string;
  valorInformado?: Decimal;
  credor?: string;
}

export interface Especificacao {
  versaoEspecificacao: '1.0';
  _titulo?: string;
  processo?: { numero?: string; regional?: string; vara?: string };
  partes?: { reclamante?: Parte; reclamado?: Parte; advogados?: { nome: string; oab?: string; representa?: string }[] };
  contrato?: {
    admissao?: Data;
    demissao?: Data;
    ajuizamento?: Data;
    tipoRescisao?: string;
    regime?: string;
    avisoPrevio?: { tipo?: string; projetar?: boolean; dias?: number };
    ultimaRemuneracao?: Decimal;
  };
  parametros?: {
    uf?: string;
    municipio?: string;
    periodoCalculo?: Periodo;
    cargaHorariaMensal?: Decimal;
    sabadoDiaUtil?: boolean;
    feriadoEstadual?: boolean;
    feriadoMunicipal?: boolean;
    prescricao?: { quinquenal?: boolean; fgtsTrintenaria?: boolean };
    maiorRemuneracao?: Decimal;
    zerarValoresNegativos?: boolean;
  };
  historicoSalarial?: HistoricoSalarial[];
  faltas?: { inicio: Data; fim: Data; justificada?: boolean; motivo?: string }[];
  ferias?: { aquisitivo: Periodo; situacao?: string; gozos?: Periodo[]; abonoPecuniario?: boolean; dobra?: boolean }[];
  verbas?: Verba[];
  fgts?: { aliquota?: Decimal; destino?: string; multa?: string; baseDaMulta?: string; deduzirDepositados?: boolean; comporPrincipal?: boolean };
  impostoDeRenda?: { apurar?: boolean; dependentes?: number; tributacaoExclusiva13?: boolean; tributacaoSeparadaFerias?: boolean; incidirSobreJuros?: boolean };
  honorarios?: Honorario[];
  correcaoJurosMulta?: { combinacao?: { aPartirDe: Data; indice: string; juros?: string }[]; indicesAcumulados?: string };
  anotacoes?: { premissas?: string[]; fontes?: { campo: string; documento?: string; pagina?: string }[] };
  [extra: string]: unknown;
}

export interface ItemErro {
  caminho: string;
  codigo: string;
  mensagem: string;
  origem?: string;
}

export interface ResultadoValidacao {
  valido: boolean;
  erros: ItemErro[];
  avisos: ItemErro[];
  validadoEm: string;
}

export interface CalculoResumo {
  id: string;
  numeroProcesso: string | null;
  regional: string | null;
  reclamante: string | null;
  reclamado: string | null;
  titulo: string | null;
  quantidadeVerbas: number;
  status: 'rascunho' | 'valido' | 'liquidado';
  versao: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Calculo extends CalculoResumo {
  especificacao: Especificacao;
  ultimaValidacao: ResultadoValidacao | null;
}

export interface VerbaCatalogo {
  nome: string;
  caracteristica: string;
  ocorrencia: string;
  incidencias: Required<Incidencias>;
  divisorPadrao: string | null;
  multiplicadorPadrao: string | null;
  reflexosDisponiveis: string[];
}

export interface Opcao {
  valor: string;
  rotulo: string;
  ajuda?: string;
}

export interface EstadoMotor {
  estado: 'nao_conectado' | 'parado' | 'iniciando' | 'pronto' | 'ocupado' | 'falhou';
  mensagem: string;
  versaoPjeCalc: string | null;
}

export interface Problema {
  title: string;
  status: number;
  codigo: string;
  detail?: string;
  erros?: ItemErro[];
  avisos?: ItemErro[];
}
