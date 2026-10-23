import { CampoDecimal, CampoDinheiro, CampoInteiro, CampoSelecao, CampoSimNao, Linha, Secao } from '../componentes/Campos';
import { useEditor } from '../paginas/contextoEditor';
import type { Honorario } from '../tipos';

const MULTA_FGTS = [
  { valor: '40', rotulo: '40% (dispensa sem justa causa)' },
  { valor: '20', rotulo: '20% (culpa recíproca ou acordo do art. 484-A)' },
  { valor: 'nao_ha', rotulo: 'Sem multa' },
];
const DEVEDOR = [{ valor: 'reclamado', rotulo: 'Reclamado (empresa)' }, { valor: 'reclamante', rotulo: 'Reclamante (trabalhador)' }];
const BASE_HON = [
  { valor: 'bruto', rotulo: 'Valor bruto da condenação' },
  { valor: 'liquido', rotulo: 'Valor líquido' },
  { valor: 'valor_informado', rotulo: 'Valor fixo informado' },
];

export function EtapaEncargos() {
  const { spec, alterar } = useEditor();
  const f = spec.fgts ?? {};
  const ir = spec.impostoDeRenda ?? {};
  const hon = spec.honorarios ?? [];
  const setF = (fn: (x: NonNullable<typeof spec.fgts>) => void) => alterar((s) => { s.fgts = { ...s.fgts }; fn(s.fgts); });
  const setIr = (fn: (x: NonNullable<typeof spec.impostoDeRenda>) => void) => alterar((s) => { s.impostoDeRenda = { ...s.impostoDeRenda }; fn(s.impostoDeRenda); });
  const setH = (i: number, fn: (x: Honorario) => void) => alterar((s) => { fn(s.honorarios![i]); });
  return (
    <>
      <Secao titulo="FGTS" descricao="O FGTS incide sobre as verbas marcadas com ✓ FGTS e sobre os históricos com “Incide FGTS”.">
        <Linha>
          <CampoDecimal rotulo="Alíquota" valor={f.aliquota} placeholder="8" sufixo="%" caminho="/fgts/aliquota"
            ajuda="8% é o padrão; 2% para contrato de aprendizagem." aoMudar={(v) => setF((x) => { x.aliquota = v; })} />
          <CampoSelecao rotulo="Multa rescisória" valor={f.multa} opcoes={MULTA_FGTS} caminho="/fgts/multa" aoMudar={(v) => setF((x) => { x.multa = v; })} />
          <CampoSimNao rotulo="Deduzir o que já foi depositado?" valor={f.deduzirDepositados} padrao caminho="/fgts/deduzirDepositados"
            ajuda="Abate os depósitos já feitos (marcados como “FGTS recolhido” nos salários)." aoMudar={(v) => setF((x) => { x.deduzirDepositados = v; })} />
        </Linha>
      </Secao>

      <Secao titulo="Contribuição social (INSS)" descricao="Neste protótipo o INSS segue os padrões do PJe-Calc (cota do empregado e do empregador sobre as verbas salariais). Ajustes finos virão numa próxima versão.">
        <p className="dica">Usando os padrões do PJe-Calc.</p>
      </Secao>

      <Secao titulo="Imposto de renda">
        <Linha>
          <CampoSimNao rotulo="Apurar imposto de renda?" valor={ir.apurar} padrao caminho="/impostoDeRenda/apurar" aoMudar={(v) => setIr((x) => { x.apurar = v; })} />
          {ir.apurar !== false && (
            <>
              <CampoInteiro rotulo="Dependentes" valor={ir.dependentes} caminho="/impostoDeRenda/dependentes" aoMudar={(v) => setIr((x) => { x.dependentes = v; })} />
              <CampoSimNao rotulo="Incidir sobre os juros?" valor={ir.incidirSobreJuros} padrao={false} caminho="/impostoDeRenda/incidirSobreJuros"
                ajuda="Em regra, não incide IR sobre juros de mora (OJ 400 da SDI-1/TST)." aoMudar={(v) => setIr((x) => { x.incidirSobreJuros = v; })} />
            </>
          )}
        </Linha>
      </Secao>

      <Secao titulo="Honorários" descricao="Honorários de sucumbência (art. 791-A da CLT) e periciais."
        acoes={<button type="button" className="botao secundario" onClick={() => alterar((s) => { s.honorarios = [...(s.honorarios ?? []), { devedor: 'reclamado', percentual: '15', base: 'bruto' }]; })}>+ Honorários</button>}>
        {hon.length === 0 && <p className="dica">Nenhum honorário informado.</p>}
        {hon.map((h, i) => (
          <div key={i} className="cartao compacto">
            <Linha>
              <CampoSelecao rotulo="Quem paga" valor={h.devedor} opcoes={DEVEDOR} caminho={`/honorarios/${i}/devedor`}
                aoMudar={(v) => setH(i, (x) => { x.devedor = (v ?? 'reclamado') as Honorario['devedor']; })} />
              <CampoSelecao rotulo="Sobre" valor={h.base} opcoes={BASE_HON} caminho={`/honorarios/${i}/base`} aoMudar={(v) => setH(i, (x) => { x.base = v; })} />
              {h.base === 'valor_informado'
                ? <CampoDinheiro rotulo="Valor" valor={h.valorInformado} caminho={`/honorarios/${i}/valorInformado`} aoMudar={(v) => setH(i, (x) => { x.valorInformado = v; })} />
                : <CampoDecimal rotulo="Percentual" valor={h.percentual} sufixo="%" caminho={`/honorarios/${i}/percentual`} aoMudar={(v) => setH(i, (x) => { x.percentual = v ?? ''; })} />}
              <button type="button" className="botao-link perigo alinhado" onClick={() => alterar((s) => { s.honorarios!.splice(i, 1); })}>Remover</button>
            </Linha>
          </div>
        ))}
      </Secao>
    </>
  );
}
