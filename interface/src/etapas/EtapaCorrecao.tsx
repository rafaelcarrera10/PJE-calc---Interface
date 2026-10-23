import { CampoSelecao, Secao } from '../componentes/Campos';
import { useEditor, useProblema } from '../paginas/contextoEditor';
import type { Especificacao } from '../tipos';
import { formatarData } from '../util/formatos';

type Linha = { aPartirDe: string; indice: string; juros?: string };

const ACUMULADOS = [
  { valor: 'MES_SUBSEQUENTE_AO_VENCIMENTO', rotulo: 'A partir do mês seguinte ao vencimento (padrão)' },
  { valor: 'MES_DO_VENCIMENTO', rotulo: 'A partir do mês do vencimento' },
  { valor: 'MES_SUBSEQUENTE_E_MES_DO_VENCIMENTO', rotulo: 'Mensais: mês seguinte; anuais e rescisórias: mês do vencimento' },
];

/** Modelos prontos. São pontos de partida: confira sempre o que a decisão do seu processo determinou. */
function modelos(s: Especificacao): { nome: string; descricao: string; linhas: Linha[] }[] {
  const adm = s.contrato?.admissao ?? '';
  const ajz = s.contrato?.ajuizamento ?? '';
  return [
    {
      nome: 'TST pós-Lei 14.905/2024',
      descricao: 'IPCA-E + juros (TRD) até o ajuizamento; SELIC do ajuizamento até 29/08/2024; IPCA + taxa legal a partir de 30/08/2024 (SDI-1/TST, E-ED-RR-713-03.2010.5.04.0011).',
      linhas: (ajz && ajz >= '2024-08-30'
        ? [
          { aPartirDe: adm, indice: 'IPCAE', juros: 'TRD_SIMPLES' },
          { aPartirDe: ajz, indice: 'IPCA', juros: 'TAXA_LEGAL' },
        ]
        : [
          { aPartirDe: adm, indice: 'IPCAE', juros: 'TRD_SIMPLES' },
          { aPartirDe: ajz, indice: 'SELIC', juros: 'SEM_JUROS' },
          { aPartirDe: '2024-08-30', indice: 'IPCA', juros: 'TAXA_LEGAL' },
        ]).filter((l) => l.aPartirDe),
    },
    {
      nome: 'ADC 58/59 (antes da Lei 14.905)',
      descricao: 'IPCA-E na fase pré-judicial e SELIC (que já inclui os juros) a partir do ajuizamento.',
      linhas: [
        { aPartirDe: adm, indice: 'IPCAE', juros: 'SEM_JUROS' },
        { aPartirDe: ajz, indice: 'SELIC', juros: 'SEM_JUROS' },
      ].filter((l) => l.aPartirDe),
    },
  ];
}

function LinhaComb({ l, i }: { l: Linha; i: number }) {
  const { alterar, catalogos } = useEditor();
  const { erro } = useProblema(`/correcaoJurosMulta/combinacao/${i}/aPartirDe`);
  const set = (fn: (x: Linha) => void) => alterar((s) => { fn(s.correcaoJurosMulta!.combinacao![i]); });
  return (
    <>
      <tr className={erro ? 'linha-erro' : ''}>
        <td><input type="date" aria-label="A partir de" value={l.aPartirDe} onChange={(e) => set((x) => { x.aPartirDe = e.target.value; })} /></td>
        <td>
          <select aria-label="Índice de correção" value={l.indice} onChange={(e) => set((x) => { x.indice = e.target.value; })}>
            {catalogos.indices.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </td>
        <td>
          <select aria-label="Juros" value={l.juros ?? ''} onChange={(e) => set((x) => { x.juros = e.target.value || undefined; })}>
            <option value="">Padrão do PJe-Calc</option>
            {catalogos.juros.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </td>
        <td><button type="button" className="botao-icone" aria-label="Remover"
          onClick={() => alterar((s) => { s.correcaoJurosMulta!.combinacao!.splice(i, 1); })}>×</button></td>
      </tr>
      {erro && <tr className="linha-msg"><td colSpan={4} className="msg-erro">{erro}</td></tr>}
    </>
  );
}

export function EtapaCorrecao() {
  const { spec, alterar } = useEditor();
  const comb = spec.correcaoJurosMulta?.combinacao ?? [];
  const aplicar = (linhas: Linha[]) => alterar((s) => { s.correcaoJurosMulta = { ...s.correcaoJurosMulta, combinacao: structuredClone(linhas) }; });
  const faltamDatas = !spec.contrato?.admissao || !spec.contrato?.ajuizamento;
  return (
    <>
      <Secao titulo="Modelos prontos" descricao="Escolha um ponto de partida e ajuste se a decisão do processo disser outra coisa.">
        {faltamDatas && <div className="aviso-faixa">Preencha admissão e ajuizamento na etapa Contrato para os modelos usarem as datas certas.</div>}
        <div className="modelos">
          {modelos(spec).map((m) => (
            <button key={m.nome} type="button" className="modelo" onClick={() => aplicar(m.linhas)}>
              <strong>{m.nome}</strong>
              <span>{m.descricao}</span>
              <span className="modelo-linhas">{m.linhas.map((l) => `${formatarData(l.aPartirDe)}: ${l.indice}${l.juros ? ` + ${l.juros}` : ''}`).join(' → ')}</span>
            </button>
          ))}
        </div>
      </Secao>

      <Secao titulo="Índices e juros por período" descricao="Cada linha vale a partir da data indicada até a próxima linha."
        acoes={<button type="button" className="botao secundario" onClick={() => alterar((s) => {
          const atual = s.correcaoJurosMulta?.combinacao ?? [];
          s.correcaoJurosMulta = { ...s.correcaoJurosMulta, combinacao: [...atual, { aPartirDe: '', indice: 'IPCAE' }] };
        })}>+ Período</button>}>
        {comb.length === 0 ? <p className="dica">Nenhum índice definido — use um modelo acima ou adicione um período.</p> : (
          <table className="tabela">
            <thead><tr><th>A partir de</th><th>Correção monetária</th><th>Juros de mora</th><th /></tr></thead>
            <tbody>{comb.map((l, i) => <LinhaComb key={i} l={l} i={i} />)}</tbody>
          </table>
        )}
        <div className="espaco" />
        <CampoSelecao rotulo="Quando começam os índices de cada verba" valor={spec.correcaoJurosMulta?.indicesAcumulados} opcoes={ACUMULADOS}
          caminho="/correcaoJurosMulta/indicesAcumulados" largura="g" vazio="Padrão do PJe-Calc"
          ajuda="Corresponde à opção “Índices acumulados” da tela de liquidação do PJe-Calc."
          aoMudar={(v) => alterar((s) => { s.correcaoJurosMulta = { ...s.correcaoJurosMulta, indicesAcumulados: v }; })} />
      </Secao>
    </>
  );
}
