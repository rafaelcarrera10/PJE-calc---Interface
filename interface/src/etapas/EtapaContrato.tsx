import { CampoData, CampoDinheiro, CampoInteiro, CampoSelecao, CampoSimNao, Linha, Secao } from '../componentes/Campos';
import { useEditor } from '../paginas/contextoEditor';
import { formatarData, somarAnos } from '../util/formatos';

const AVISO = [
  { valor: 'indenizado', rotulo: 'Indenizado' },
  { valor: 'trabalhado', rotulo: 'Trabalhado' },
  { valor: 'nao_ha', rotulo: 'Não há aviso' },
];

export function EtapaContrato() {
  const { spec, alterar, catalogos } = useEditor();
  const c = spec.contrato ?? {};
  const set = (fn: (c: NonNullable<typeof spec.contrato>) => void) => alterar((s) => { s.contrato = { ...s.contrato }; fn(s.contrato); });
  const limitePrescricao = c.ajuizamento ? somarAnos(c.ajuizamento, -5) : null;
  return (
    <>
      <Secao titulo="Datas do contrato" descricao="As datas definem o período do cálculo e a prescrição.">
        <Linha>
          <CampoData rotulo="Admissão" obrigatorio valor={c.admissao} caminho="/contrato/admissao" aoMudar={(v) => set((x) => { x.admissao = v; })} />
          <CampoData rotulo="Demissão" valor={c.demissao} caminho="/contrato/demissao"
            ajuda="Último dia do contrato (sem a projeção do aviso). Deixe em branco se o contrato continua."
            aoMudar={(v) => set((x) => { x.demissao = v; })} />
          <CampoData rotulo="Ajuizamento da ação" obrigatorio valor={c.ajuizamento} caminho="/contrato/ajuizamento"
            ajuda="Data em que a reclamação foi protocolada. Serve para a prescrição quinquenal e para a fase de correção."
            aoMudar={(v) => set((x) => { x.ajuizamento = v; })} />
        </Linha>
        {limitePrescricao && (
          <p className="dica-faixa">Com prescrição quinquenal, só contam valores a partir de <strong>{formatarData(limitePrescricao)}</strong> (5 anos antes do ajuizamento).</p>
        )}
      </Secao>

      <Secao titulo="Fim do contrato">
        <Linha>
          <CampoSelecao rotulo="Como o contrato terminou" valor={c.tipoRescisao} opcoes={catalogos.tiposRescisao} caminho="/contrato/tipoRescisao"
            aoMudar={(v) => set((x) => { x.tipoRescisao = v; })} />
          <CampoDinheiro rotulo="Última remuneração" valor={c.ultimaRemuneracao} caminho="/contrato/ultimaRemuneracao"
            ajuda="Usada como referência para verbas rescisórias quando não houver histórico salarial."
            aoMudar={(v) => set((x) => { x.ultimaRemuneracao = v; })} />
        </Linha>
        <Linha>
          <CampoSelecao rotulo="Aviso prévio" valor={c.avisoPrevio?.tipo} opcoes={AVISO} caminho="/contrato/avisoPrevio/tipo"
            aoMudar={(v) => set((x) => { x.avisoPrevio = { ...x.avisoPrevio, tipo: v }; })} />
          {c.avisoPrevio?.tipo === 'indenizado' && (
            <CampoSimNao rotulo="Projetar o aviso no tempo de serviço?" valor={c.avisoPrevio?.projetar} caminho="/contrato/avisoPrevio/projetar"
              ajuda="O aviso indenizado conta como tempo de serviço (art. 487, §1º, CLT), o que afeta 13º, férias e FGTS."
              aoMudar={(v) => set((x) => { x.avisoPrevio = { ...x.avisoPrevio, projetar: v }; })} />
          )}
          {c.avisoPrevio?.tipo && c.avisoPrevio.tipo !== 'nao_ha' && (
            <CampoInteiro rotulo="Dias de aviso" valor={c.avisoPrevio?.dias} min={30} caminho="/contrato/avisoPrevio/dias"
              ajuda="Deixe em branco para o PJe-Calc calcular pela Lei 12.506/2011 (30 dias + 3 por ano, até 90)."
              aoMudar={(v) => set((x) => { x.avisoPrevio = { ...x.avisoPrevio, dias: v }; })} />
          )}
        </Linha>
      </Secao>
    </>
  );
}
