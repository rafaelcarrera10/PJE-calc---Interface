// Registro das versões do PJe-Calc mapeadas: a conexão lê a versão da instância e escolhe a implementação.
// Versões sem mapeamento são recusadas (README do adaptador, "Regras de operação").
import type { OperadorPjeCalc } from '../dominio.js';
import { ErroAdaptador } from '../nucleo/erros.js';
import { normalizar, type Pagina } from '../nucleo/html.js';
import { SessaoJsf } from '../nucleo/sessao-jsf.js';
import { OperadorPjeCalc216 } from './2.16/operacoes.js';

type Fabrica = (sessao: SessaoJsf, versao: string, principal: Pagina) => OperadorPjeCalc;

const VERSOES: Record<string, Fabrica> = {
  '2.16.0': (sessao, versao, principal) => new OperadorPjeCalc216(sessao, versao, principal),
};

export const VERSOES_SUPORTADAS = Object.keys(VERSOES);

/** Página que todas as versões conhecidas servem e que exibe "Versão: x.y.z" no cabeçalho. */
const PAGINA_PRINCIPAL = '/pjecalc/pages/principal.jsf';

export async function conectar(urlBase: string): Promise<OperadorPjeCalc> {
  const sessao = new SessaoJsf(urlBase);
  const principal = await sessao.abrir(PAGINA_PRINCIPAL);
  const versao = /Vers[ãa]o:\s*([\d.]+)/.exec(normalizar(principal.raiz.text))?.[1];
  const fabrica = versao ? VERSOES[versao] : undefined;
  if (!versao || !fabrica) {
    throw new ErroAdaptador('INSTALACAO_INVALIDA', `Versão do PJe-Calc sem mapeamento no adaptador: ${versao ?? 'desconhecida'}`, { suportadas: VERSOES_SUPORTADAS });
  }
  return fabrica(sessao, versao, principal);
}
