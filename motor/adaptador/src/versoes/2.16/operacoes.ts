// Operações sobre o PJe-Calc 2.16 por HTTP. Cada cálculo é trabalhado numa conversa própria e excluído ao final.
import type { CalculoPjeCalc, FormatoRelatorio, IndicesAcumulados, OperadorPjeCalc, ResumoCalculo } from '../../dominio.js';
import { ErroAdaptador } from '../../nucleo/erros.js';
import type { Mensagem, Pagina } from '../../nucleo/html.js';
import type { Arquivo, SessaoJsf } from '../../nucleo/sessao-jsf.js';
import { dataBr, exigirSucesso, idMenu, valorDoRadio, type ItemMenu } from '../../nucleo/telas.js';
import { CAMPOS, MENU, PAGINAS, ROTULOS_FORMATO, ROTULOS_INDICES_ACUMULADOS } from './mapa.js';
import { lerResumo } from './relatorio.js';

export class OperadorPjeCalc216 implements OperadorPjeCalc {
  /** Página principal já aberta na conexão; aproveitada na primeira importação para evitar um GET repetido. */
  private principalAberta?: Pagina;

  constructor(private readonly sessao: SessaoJsf, readonly versao: string, principal?: Pagina) {
    this.principalAberta = principal;
  }

  async importar(pjc: Arquivo): Promise<CalculoPjeCalc> {
    const principal = this.principalAberta ?? (await this.sessao.abrir(PAGINAS.principal));
    this.principalAberta = undefined;
    const { pagina } = await this.sessao.acionar(principal, idMenu(principal, MENU.importar));
    const c = CAMPOS.importacao;
    const aberta = await this.sessao.enviarArquivo(pagina, c.componenteUpload, pjc, { [c.confirmar]: 'Confirmar' });
    exigirSucesso(aberta.mensagens, 'importar');
    const id = Number(aberta.raiz.getElementById(CAMPOS.calculo.id)?.getAttribute('value'));
    if (!Number.isInteger(id) || id <= 0) {
      throw new ErroAdaptador('RESPOSTA_INESPERADA', 'A importação não abriu um cálculo', { mensagens: aberta.mensagens });
    }
    return new Calculo216(this.sessao, id, aberta);
  }

  lerResumo(relatorioHtml: Uint8Array): ResumoCalculo {
    return lerResumo(relatorioHtml);
  }
}

class Calculo216 implements CalculoPjeCalc {
  constructor(private readonly sessao: SessaoJsf, readonly id: number, private pagina: Pagina) {}

  async liquidar(data: string, indices: IndicesAcumulados = 'MES_SUBSEQUENTE_AO_VENCIMENTO'): Promise<Mensagem[]> {
    const tela = await this.irPara(MENU.liquidar);
    const c = CAMPOS.liquidacao;
    const r = await this.sessao.acionar(tela, c.liquidar, {
      [c.data]: dataBr(data),
      [c.indicesAcumulados]: valorDoRadio(tela, c.indicesAcumulados, ROTULOS_INDICES_ACUMULADOS[indices]),
    });
    this.pagina = r.pagina;
    exigirSucesso(r.mensagens, 'liquidar');
    return r.mensagens;
  }

  /** Relatório consolidado com as seções marcadas por padrão no PJe-Calc. */
  async relatorio(formato: FormatoRelatorio): Promise<Arquivo> {
    const tela = await this.irPara(MENU.imprimir);
    const c = CAMPOS.relatorio;
    return this.baixar(tela, c.imprimir, { [c.formato]: valorDoRadio(tela, c.formato, ROTULOS_FORMATO[formato]) });
  }

  /** .PJC oficial exportado pelo PJe-Calc. */
  async exportar(nomeArquivo?: string): Promise<Arquivo> {
    const tela = await this.irPara(MENU.exportar);
    const c = CAMPOS.exportacao;
    return this.baixar(tela, c.exportar, nomeArquivo ? { [c.nomeArquivo]: nomeArquivo } : {});
  }

  /** O PJe-Calc pede confirmação da exclusão só no navegador (função confirma()); por HTTP basta acionar o menu. */
  async excluir(): Promise<void> {
    const r = await this.sessao.acionar(this.pagina, idMenu(this.pagina, MENU.excluir));
    exigirSucesso(r.mensagens, 'excluir');
    this.pagina = r.pagina;
  }

  private async irPara(item: ItemMenu): Promise<Pagina> {
    const { pagina } = await this.sessao.acionar(this.pagina, idMenu(this.pagina, item));
    this.pagina = pagina;
    return pagina;
  }

  private async baixar(tela: Pagina, idComponente: string, alteracoes: Record<string, string>): Promise<Arquivo> {
    const { arquivo, resultado } = await this.sessao.acionarEBaixar(tela, idComponente, alteracoes);
    this.pagina = resultado.pagina;
    return arquivo;
  }
}
