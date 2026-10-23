import { useState, type ReactNode } from 'react';
import { Secao } from '../componentes/Campos';
import { useEditor } from '../paginas/contextoEditor';
import { etapaDoCaminho, tituloDaEtapa } from '../paginas/etapasMeta';
import type { ItemErro } from '../tipos';
import { formatarData, formatarDinheiro } from '../util/formatos';

function Bloco({ titulo, etapa, children }: { titulo: string; etapa: string; children: ReactNode }) {
  const { irPara } = useEditor();
  return (
    <div className="bloco-revisao">
      <div className="bloco-topo"><h3>{titulo}</h3><button type="button" className="botao-link" onClick={() => irPara(etapa)}>Editar</button></div>
      {children}
    </div>
  );
}

const Item = ({ r, v }: { r: string; v: ReactNode }) => <div className="item"><span>{r}</span><strong>{v ?? '—'}</strong></div>;

function ListaProblemas({ itens, tipo }: { itens: ItemErro[]; tipo: 'erro' | 'aviso' }) {
  const { irPara } = useEditor();
  return (
    <ul className={`problemas ${tipo}`}>
      {itens.map((e, i) => (
        <li key={i}>
          <button type="button" onClick={() => irPara(etapaDoCaminho(e.caminho))}>
            <span className="problema-etapa">{tituloDaEtapa(etapaDoCaminho(e.caminho))}</span>
            <span>{e.mensagem}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function EtapaRevisao() {
  const { spec, erros, avisos, validarAgora, catalogos } = useEditor();
  const nomeIndice = (v: string) => catalogos.indices.find((o) => o.valor === v)?.rotulo ?? v;
  const nomeJuros = (v: string) => catalogos.juros.find((o) => o.valor === v)?.rotulo ?? v;
  const [validando, setValidando] = useState(false);
  const c = spec.contrato ?? {};
  const rotuloSimNao = (v?: boolean, padrao?: boolean) => ((v ?? padrao) ? 'Sim' : 'Não');
  return (
    <>
      <Secao titulo="Pendências"
        descricao="Conferência feita pela própria API. Quando o PJe-Calc estiver conectado, ele também fará a conferência oficial dele antes de liquidar."
        acoes={<button type="button" className="botao secundario" disabled={validando} onClick={async () => { setValidando(true); await validarAgora(); setValidando(false); }}>{validando ? 'Conferindo…' : 'Conferir de novo'}</button>}>
        {erros.length === 0 ? (
          <div className="aviso-faixa sucesso">Nenhuma pendência que impeça a liquidação.{avisos.length ? ` ${avisos.length} aviso(s) para você conferir.` : ''}</div>
        ) : (
          <>
            <div className="aviso-faixa erro">{erros.length} pendência(s) precisam ser resolvidas antes de liquidar. Clique para ir até o campo.</div>
            <ListaProblemas itens={erros} tipo="erro" />
          </>
        )}
        {avisos.length > 0 && (<><h3 className="subtitulo">Avisos (não impedem)</h3><ListaProblemas itens={avisos} tipo="aviso" /></>)}
      </Secao>

      <Secao titulo="Resumo do cálculo">
        <div className="grade-revisao">
          <Bloco titulo="Processo e partes" etapa="processo">
            <Item r="Processo" v={spec.processo?.numero} />
            <Item r="TRT" v={spec.processo?.regional} />
            <Item r="Reclamante" v={spec.partes?.reclamante?.nome} />
            <Item r="Reclamado" v={spec.partes?.reclamado?.nome} />
          </Bloco>
          <Bloco titulo="Contrato" etapa="contrato">
            <Item r="Admissão" v={formatarData(c.admissao)} />
            <Item r="Demissão" v={formatarData(c.demissao)} />
            <Item r="Ajuizamento" v={formatarData(c.ajuizamento)} />
            <Item r="Aviso prévio" v={c.avisoPrevio?.tipo ? `${c.avisoPrevio.tipo}${c.avisoPrevio.projetar ? ' (projetado)' : ''}` : undefined} />
          </Bloco>
          <Bloco titulo="Local e jornada" etapa="parametros">
            <Item r="Local" v={[spec.parametros?.municipio, spec.parametros?.uf].filter(Boolean).join(' / ') || undefined} />
            <Item r="Carga horária" v={spec.parametros?.cargaHorariaMensal ? `${spec.parametros.cargaHorariaMensal} h` : '220 h (padrão)'} />
            <Item r="Sábado dia útil" v={rotuloSimNao(spec.parametros?.sabadoDiaUtil, true)} />
            <Item r="Prescrição quinquenal" v={rotuloSimNao(spec.parametros?.prescricao?.quinquenal, true)} />
          </Bloco>
          <Bloco titulo="Salários" etapa="salarios">
            {(spec.historicoSalarial ?? []).length === 0 ? <p className="dica">Nenhum histórico.</p> : spec.historicoSalarial!.map((h) => (
              <Item key={h.nome} r={h.nome} v={`${h.periodos.length} faixa(s)${h.periodos[0] ? ` · de R$ ${formatarDinheiro(h.periodos[0].valor)}` : ''}`} />
            ))}
          </Bloco>
          <Bloco titulo="Verbas" etapa="verbas">
            {(spec.verbas ?? []).length === 0 ? <p className="dica">Nenhuma verba.</p> : spec.verbas!.map((v, i) => (
              <Item key={i} r={v.catalogo ?? 'Personalizada'} v={`${v.periodo ? `${formatarData(v.periodo.inicio)} a ${formatarData(v.periodo.fim)}` : 'período padrão'}${v.reflexos?.length ? ` · ${v.reflexos.length} reflexo(s)` : ''}`} />
            ))}
          </Bloco>
          <Bloco titulo="Encargos" etapa="encargos">
            <Item r="FGTS" v={`${spec.fgts?.aliquota ?? '8'}% · multa ${spec.fgts?.multa === 'nao_ha' ? 'não' : `${spec.fgts?.multa ?? '40'}%`}`} />
            <Item r="Imposto de renda" v={spec.impostoDeRenda?.apurar === false ? 'Não apurar' : `Apurar${spec.impostoDeRenda?.dependentes ? ` · ${spec.impostoDeRenda.dependentes} dependente(s)` : ''}`} />
            <Item r="Honorários" v={(spec.honorarios ?? []).map((h) => `${h.percentual}% (${h.devedor})`).join(', ') || undefined} />
          </Bloco>
          <Bloco titulo="Correção e juros" etapa="correcao">
            {(spec.correcaoJurosMulta?.combinacao ?? []).length === 0 ? <p className="dica">Padrão do PJe-Calc.</p>
              : spec.correcaoJurosMulta!.combinacao!.map((l, i) => <Item key={i} r={`A partir de ${formatarData(l.aPartirDe)}`} v={`${nomeIndice(l.indice)}${l.juros ? ` + ${nomeJuros(l.juros)}` : ''}`} />)}
          </Bloco>
        </div>
      </Secao>
    </>
  );
}
