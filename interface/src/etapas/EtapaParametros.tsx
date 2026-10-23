import { CampoData, CampoDecimal, CampoDinheiro, CampoSelecao, CampoSimNao, CampoTexto, Linha, Secao } from '../componentes/Campos';
import { useEditor } from '../paginas/contextoEditor';

export function EtapaParametros() {
  const { spec, alterar, catalogos } = useEditor();
  const p = spec.parametros ?? {};
  const set = (fn: (p: NonNullable<typeof spec.parametros>) => void) => alterar((s) => { s.parametros = { ...s.parametros }; fn(s.parametros); });
  return (
    <>
      <Secao titulo="Local de trabalho" descricao="Define os feriados estaduais e municipais considerados no calendário.">
        <Linha>
          <CampoSelecao rotulo="UF" valor={p.uf} opcoes={catalogos.ufs} caminho="/parametros/uf" largura="p" aoMudar={(v) => set((x) => { x.uf = v; })} />
          <CampoTexto rotulo="Município" valor={p.municipio} caminho="/parametros/municipio" aoMudar={(v) => set((x) => { x.municipio = v; })} />
        </Linha>
        <Linha>
          <CampoSimNao rotulo="Considerar feriados estaduais?" valor={p.feriadoEstadual} padrao caminho="/parametros/feriadoEstadual" aoMudar={(v) => set((x) => { x.feriadoEstadual = v; })} />
          <CampoSimNao rotulo="Considerar feriados municipais?" valor={p.feriadoMunicipal} padrao caminho="/parametros/feriadoMunicipal" aoMudar={(v) => set((x) => { x.feriadoMunicipal = v; })} />
        </Linha>
      </Secao>

      <Secao titulo="Jornada">
        <Linha>
          <CampoDecimal rotulo="Carga horária mensal" valor={p.cargaHorariaMensal} placeholder="220" sufixo="horas" caminho="/parametros/cargaHorariaMensal"
            ajuda="220 h para 44 h semanais; 180 h para 36 h; 200 h para 40 h. Serve de divisor das horas extras."
            aoMudar={(v) => set((x) => { x.cargaHorariaMensal = v; })} />
          <CampoSimNao rotulo="Sábado é dia útil?" valor={p.sabadoDiaUtil} padrao caminho="/parametros/sabadoDiaUtil"
            ajuda="Afeta o cálculo do repouso semanal remunerado (dias úteis × repousos no mês)."
            aoMudar={(v) => set((x) => { x.sabadoDiaUtil = v; })} />
          <CampoDinheiro rotulo="Maior remuneração" valor={p.maiorRemuneracao} caminho="/parametros/maiorRemuneracao"
            ajuda="Base de algumas verbas rescisórias (ex.: indenização do art. 477). Opcional."
            aoMudar={(v) => set((x) => { x.maiorRemuneracao = v; })} />
        </Linha>
      </Secao>

      <Secao titulo="Prescrição e período do cálculo">
        <Linha>
          <CampoSimNao rotulo="Aplicar prescrição quinquenal?" valor={p.prescricao?.quinquenal} padrao caminho="/parametros/prescricao/quinquenal"
            ajuda="Descarta valores anteriores a 5 anos do ajuizamento (art. 7º, XXIX, CF)."
            aoMudar={(v) => set((x) => { x.prescricao = { ...x.prescricao, quinquenal: v }; })} />
          <CampoSimNao rotulo="FGTS com prescrição trintenária?" valor={p.prescricao?.fgtsTrintenaria} padrao={false} caminho="/parametros/prescricao/fgtsTrintenaria"
            ajuda="Só em situações de transição (STF, ARE 709.212). Na dúvida, mantenha Não."
            aoMudar={(v) => set((x) => { x.prescricao = { ...x.prescricao, fgtsTrintenaria: v }; })} />
          <CampoSimNao rotulo="Zerar valores negativos?" valor={p.zerarValoresNegativos} padrao caminho="/parametros/zerarValoresNegativos"
            ajuda="Quando o valor pago supera o devido num mês, a diferença negativa é zerada em vez de abater dos outros meses."
            aoMudar={(v) => set((x) => { x.zerarValoresNegativos = v; })} />
        </Linha>
        <p className="dica-faixa">Período do cálculo: deixe em branco para o PJe-Calc usar da admissão (ou do marco prescricional) até a demissão.</p>
        <Linha>
          <CampoData rotulo="Início do cálculo" valor={p.periodoCalculo?.inicio} caminho="/parametros/periodoCalculo/inicio"
            aoMudar={(v) => set((x) => { x.periodoCalculo = v || x.periodoCalculo?.fim ? { inicio: v ?? '', fim: x.periodoCalculo?.fim ?? '' } : undefined; })} />
          <CampoData rotulo="Fim do cálculo" valor={p.periodoCalculo?.fim} caminho="/parametros/periodoCalculo/fim"
            aoMudar={(v) => set((x) => { x.periodoCalculo = v || x.periodoCalculo?.inicio ? { inicio: x.periodoCalculo?.inicio ?? '', fim: v ?? '' } : undefined; })} />
        </Linha>
      </Secao>
    </>
  );
}
