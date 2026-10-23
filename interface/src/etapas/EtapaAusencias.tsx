import { CampoData, CampoSelecao, CampoSimNao, CampoTexto, Linha, Secao } from '../componentes/Campos';
import { useEditor } from '../paginas/contextoEditor';

const SITUACAO = [
  { valor: 'gozadas', rotulo: 'Gozadas' },
  { valor: 'indenizadas', rotulo: 'Indenizadas (não gozadas)' },
  { valor: 'gozadas_parcialmente', rotulo: 'Gozadas parcialmente' },
  { valor: 'perdidas', rotulo: 'Perdidas' },
];

export function EtapaAusencias() {
  const { spec, alterar } = useEditor();
  const faltas = spec.faltas ?? [];
  const ferias = spec.ferias ?? [];
  return (
    <>
      <Secao titulo="Faltas" descricao="Opcional. Faltas reduzem verbas proporcionais (13º, férias) e podem ser excluídas das verbas mensais."
        acoes={<button type="button" className="botao secundario" onClick={() => alterar((s) => { s.faltas = [...(s.faltas ?? []), { inicio: '', fim: '' }]; })}>+ Falta</button>}>
        {faltas.length === 0 && <p className="dica">Nenhuma falta informada.</p>}
        {faltas.map((f, i) => (
          <div key={i} className="cartao compacto">
            <Linha>
              <CampoData rotulo="De" valor={f.inicio} caminho={`/faltas/${i}/inicio`} aoMudar={(v) => alterar((s) => { s.faltas![i].inicio = v ?? ''; })} />
              <CampoData rotulo="Até" valor={f.fim} caminho={`/faltas/${i}/fim`} aoMudar={(v) => alterar((s) => { s.faltas![i].fim = v ?? ''; })} />
              <CampoSimNao rotulo="Justificada?" valor={f.justificada} padrao={false} aoMudar={(v) => alterar((s) => { s.faltas![i].justificada = v; })} />
              <CampoTexto rotulo="Motivo" valor={f.motivo} aoMudar={(v) => alterar((s) => { s.faltas![i].motivo = v; })} />
              <button type="button" className="botao-link perigo alinhado" onClick={() => alterar((s) => { s.faltas!.splice(i, 1); })}>Remover</button>
            </Linha>
          </div>
        ))}
      </Secao>

      <Secao titulo="Férias" descricao="Opcional. Informe os períodos aquisitivos e se foram gozados. Sem isso, o PJe-Calc gera os períodos pelas datas do contrato."
        acoes={<button type="button" className="botao secundario" onClick={() => alterar((s) => { s.ferias = [...(s.ferias ?? []), { aquisitivo: { inicio: '', fim: '' }, situacao: 'gozadas' }]; })}>+ Período aquisitivo</button>}>
        {ferias.length === 0 && <p className="dica">Nenhum período informado.</p>}
        {ferias.map((f, i) => (
          <div key={i} className="cartao compacto">
            <Linha>
              <CampoData rotulo="Aquisitivo de" valor={f.aquisitivo?.inicio} caminho={`/ferias/${i}/aquisitivo/inicio`} aoMudar={(v) => alterar((s) => { s.ferias![i].aquisitivo.inicio = v ?? ''; })} />
              <CampoData rotulo="até" valor={f.aquisitivo?.fim} caminho={`/ferias/${i}/aquisitivo/fim`} aoMudar={(v) => alterar((s) => { s.ferias![i].aquisitivo.fim = v ?? ''; })} />
              <CampoSelecao rotulo="Situação" valor={f.situacao} opcoes={SITUACAO} aoMudar={(v) => alterar((s) => { s.ferias![i].situacao = v; })} />
              <CampoSimNao rotulo="Em dobro?" valor={f.dobra} padrao={false} ajuda="Férias concedidas fora do prazo (art. 137, CLT)." aoMudar={(v) => alterar((s) => { s.ferias![i].dobra = v; })} />
              <button type="button" className="botao-link perigo alinhado" onClick={() => alterar((s) => { s.ferias!.splice(i, 1); })}>Remover</button>
            </Linha>
          </div>
        ))}
      </Secao>

      <Secao titulo="Cartão de ponto" descricao="Importação de cartões (quantidades mensais ou horários dia a dia) chega numa próxima versão. Por enquanto, use quantidade fixa por mês nas verbas.">
        <p className="dica">Em breve.</p>
      </Secao>
    </>
  );
}
