// Catálogos. ATENÇÃO: provisórios — extraídos do PJe-Calc 2.14.0 (biblioteca de verbas e enums do bytecode).
// Quando o adaptador existir (Fase 1), passam a ser lidos do PJe-Calc instalado (docs/02, banco-de-dados.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { ErroApi } from '../problemas.js';

export interface VerbaCatalogo {
  nome: string;
  caracteristica: string;
  ocorrencia: string;
  incidencias: { inss: boolean; irpf: boolean; fgts: boolean; previdenciaPrivada: boolean; pensaoAlimenticia: boolean };
  divisorPadrao: string | null;
  multiplicadorPadrao: string | null;
  reflexosDisponiveis: string[];
}

const aqui = path.dirname(fileURLToPath(import.meta.url));
let cache: { origem: string; versaoPjeCalc: string; verbas: VerbaCatalogo[] } | null = null;

export function catalogoVerbas() {
  cache ??= JSON.parse(fs.readFileSync(path.join(aqui, '..', 'dados', 'catalogo-verbas.json'), 'utf8'));
  return cache!;
}

type Opcao = { valor: string; rotulo: string; ajuda?: string };

const CATALOGOS: Record<string, Opcao[]> = {
  'indices-correcao': [
    { valor: 'IPCAE', rotulo: 'IPCA-E', ajuda: 'Fase pré-judicial (ADC 58/59 do STF).' },
    { valor: 'SELIC', rotulo: 'SELIC', ajuda: 'Já inclui juros. Após o ajuizamento até 29/08/2024 (ADC 58/59).' },
    { valor: 'IPCA', rotulo: 'IPCA', ajuda: 'Correção a partir de 30/08/2024 (Lei 14.905/2024).' },
    { valor: 'TABELA_UNICA_JT_MENSAL', rotulo: 'Tabela Única JT (mensal)' },
    { valor: 'TABELA_UNICA_JT_DIARIO', rotulo: 'Tabela Única JT (diária)' },
    { valor: 'INDICE_TRABALHISTA', rotulo: 'Índice trabalhista (padrão do PJe-Calc)' },
    { valor: 'TR', rotulo: 'TR' },
    { valor: 'INPC', rotulo: 'INPC' },
    { valor: 'IGPM', rotulo: 'IGP-M' },
    { valor: 'IPC', rotulo: 'IPC' },
    { valor: 'IPCAETR', rotulo: 'IPCA-E/TR' },
    { valor: 'SELIC_FAZENDA', rotulo: 'SELIC (Fazenda Pública)' },
    { valor: 'SELIC_BACEN', rotulo: 'SELIC (Bacen)' },
    { valor: 'TUACDT', rotulo: 'TUACDT' },
    { valor: 'JAM', rotulo: 'JAM (FGTS)' },
    { valor: 'TABELA_DEVEDOR_FAZENDA', rotulo: 'Tabela devedor Fazenda Pública' },
    { valor: 'TABELA_INDEBITO_TRIBUTARIO', rotulo: 'Tabela de indébito tributário' },
    { valor: 'SEM_CORRECAO', rotulo: 'Sem correção' },
  ],
  juros: [
    { valor: 'SEM_JUROS', rotulo: 'Sem juros', ajuda: 'Use junto com a SELIC, que já embute os juros.' },
    { valor: 'TAXA_LEGAL', rotulo: 'Taxa legal (SELIC − IPCA)', ajuda: 'A partir de 30/08/2024 (Lei 14.905/2024).' },
    { valor: 'TRD_SIMPLES', rotulo: 'TRD simples (art. 39, caput, Lei 8.177/91)' },
    { valor: 'TRD_COMPOSTOS', rotulo: 'TRD compostos' },
    { valor: 'JUROS_PADRAO', rotulo: 'Juros padrão do PJe-Calc' },
    { valor: 'JUROS_UM_PORCENTO', rotulo: '1% ao mês' },
    { valor: 'JUROS_MEIO_PORCENTO', rotulo: '0,5% ao mês' },
    { valor: 'JUROS_ZERO_TRINTA_TRES', rotulo: '0,0333% ao dia' },
    { valor: 'JUROS_POUPANCA', rotulo: 'Poupança' },
    { valor: 'FAZENDA_PUBLICA', rotulo: 'Fazenda Pública' },
    { valor: 'SELIC', rotulo: 'SELIC (como juros)' },
    { valor: 'SELIC_FAZENDA', rotulo: 'SELIC Fazenda' },
    { valor: 'SELIC_BACEN', rotulo: 'SELIC Bacen' },
  ],
  'tipos-rescisao': [
    { valor: 'sem_justa_causa', rotulo: 'Dispensa sem justa causa' },
    { valor: 'justa_causa', rotulo: 'Dispensa por justa causa' },
    { valor: 'pedido_demissao', rotulo: 'Pedido de demissão' },
    { valor: 'rescisao_indireta', rotulo: 'Rescisão indireta' },
    { valor: 'acordo_484A', rotulo: 'Acordo (art. 484-A da CLT)' },
    { valor: 'termino_contrato', rotulo: 'Término de contrato a prazo' },
    { valor: 'vigente', rotulo: 'Contrato ainda vigente' },
  ],
  regionais: Array.from({ length: 24 }, (_, i) => ({ valor: `TRT${i + 1}`, rotulo: `TRT da ${i + 1}ª Região` })),
  ufs: 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'
    .split(' ').map((uf) => ({ valor: uf, rotulo: uf })),
};

export function registrarCatalogos(app: FastifyInstance) {
  app.get('/v1/catalogos/verbas', async (req) => {
    const { busca } = req.query as { busca?: string };
    const c = catalogoVerbas();
    const termo = busca ? normalizar(busca) : '';
    return {
      provisorio: true,
      origem: c.origem,
      versaoPjeCalc: c.versaoPjeCalc,
      verbas: termo ? c.verbas.filter((v) => normalizar(v.nome).includes(termo)) : c.verbas,
    };
  });

  app.get('/v1/catalogos/:nome', async (req) => {
    const { nome } = req.params as { nome: string };
    const lista = CATALOGOS[nome];
    if (!lista) throw new ErroApi(404, 'NAO_ENCONTRADO', 'Catálogo não encontrado', `Disponíveis: ${Object.keys(CATALOGOS).join(', ')}`);
    return lista;
  });
}

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
