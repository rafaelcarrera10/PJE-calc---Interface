import { useEffect, useState } from 'react';
import { Secao } from '../componentes/Campos';
import { useEditor, useProblema } from '../paginas/contextoEditor';
import type { HistoricoSalarial, PeriodoSalarial } from '../tipos';
import { formatarDinheiro, lerDinheiro } from '../util/formatos';

const SUGESTOES = ['Salário base', 'Comissões', 'Adicional noturno pago', 'Gratificação'];

function proximoMes(comp?: string) {
  if (!comp) return '';
  let [a, m] = comp.split('-').map(Number);
  m++; if (m > 12) { m = 1; a++; }
  return `${a}-${String(m).padStart(2, '0')}`;
}

/** Aceita linhas "03/2019 [tab|;] 12/2021 [tab|;] 3.000,00" ou "03/2019 3.000,00" (um mês). */
export function lerColagem(texto: string): { periodos: PeriodoSalarial[]; ignoradas: number } {
  const periodos: PeriodoSalarial[] = [];
  let ignoradas = 0;
  for (const linha of texto.split(/\r?\n/)) {
    if (!linha.trim()) continue;
    const comps = [...linha.matchAll(/(\d{1,2})\/(\d{4})/g)].map((m) => `${m[2]}-${m[1].padStart(2, '0')}`);
    const resto = linha.replace(/\d{1,2}\/\d{4}/g, ' ').trim().split(/[\t;]+|\s{2,}/).filter(Boolean).pop() ?? '';
    const valor = lerDinheiro(resto);
    if (comps.length === 0 || !valor) { ignoradas++; continue; }
    periodos.push({ de: comps[0], ate: comps[1] ?? comps[0], valor });
  }
  return { periodos, ignoradas };
}

function ValorInline({ valor, aoMudar, rotulo }: { valor?: string; aoMudar: (v: string | undefined) => void; rotulo: string }) {
  const [t, setT] = useState(formatarDinheiro(valor));
  const [ruim, setRuim] = useState(false);
  useEffect(() => setT(formatarDinheiro(valor)), [valor]);
  return (
    <input aria-label={rotulo} className={`valor ${ruim ? 'invalido' : ''}`} inputMode="decimal" value={t} placeholder="0,00"
      onChange={(e) => setT(e.target.value)}
      onBlur={() => { const v = lerDinheiro(t); if (v === null) { setRuim(true); return; } setRuim(false); aoMudar(v); setT(formatarDinheiro(v)); }} />
  );
}

function LinhaPeriodo({ i, j, p, aoMudar, aoRemover }: { i: number; j: number; p: PeriodoSalarial; aoMudar: (fn: (p: PeriodoSalarial) => void) => void; aoRemover: () => void }) {
  const base = `/historicoSalarial/${i}/periodos/${j}`;
  const problemas = [useProblema(`${base}/de`), useProblema(`${base}/ate`), useProblema(`${base}/valor`)];
  const msg = problemas.map((x) => x.erro ?? x.aviso).find(Boolean);
  const temErro = problemas.some((x) => x.erro);
  return (
    <>
      <tr className={temErro ? 'linha-erro' : ''}>
        <td><input aria-label="De" type="month" value={p.de ?? ''} onChange={(e) => aoMudar((x) => { x.de = e.target.value; })} /></td>
        <td><input aria-label="Até" type="month" value={p.ate ?? ''} onChange={(e) => aoMudar((x) => { x.ate = e.target.value; })} /></td>
        <td><ValorInline rotulo="Valor" valor={p.valor} aoMudar={(v) => aoMudar((x) => { x.valor = v ?? ''; })} /></td>
        <td className="centro"><input aria-label="FGTS recolhido" type="checkbox" checked={!!p.fgtsRecolhido} onChange={(e) => aoMudar((x) => { x.fgtsRecolhido = e.target.checked; })} /></td>
        <td className="centro"><input aria-label="INSS recolhido" type="checkbox" checked={!!p.inssRecolhido} onChange={(e) => aoMudar((x) => { x.inssRecolhido = e.target.checked; })} /></td>
        <td><button type="button" className="botao-icone" aria-label="Remover faixa" onClick={aoRemover}>×</button></td>
      </tr>
      {msg && <tr className="linha-msg"><td colSpan={6} className={temErro ? 'msg-erro' : 'msg-aviso'}>{msg}</td></tr>}
    </>
  );
}

export function EtapaSalarios() {
  const { spec, alterar } = useEditor();
  const historicos = spec.historicoSalarial ?? [];
  const [colando, setColando] = useState<number | null>(null);
  const [textoColado, setTextoColado] = useState('');
  const [infoColagem, setInfoColagem] = useState<string | null>(null);

  const mudarHist = (i: number, fn: (h: HistoricoSalarial) => void) => alterar((s) => { fn(s.historicoSalarial![i]); });

  function adicionarHistorico(nome: string) {
    alterar((s) => {
      s.historicoSalarial = [...(s.historicoSalarial ?? []), { nome, incidencias: { fgts: true, inss: true }, periodos: [] }];
    });
  }

  function renomear(i: number, novo: string) {
    alterar((s) => {
      const antigo = s.historicoSalarial![i].nome;
      s.historicoSalarial![i].nome = novo;
      // Mantém as verbas apontando para o histórico renomeado.
      s.verbas?.forEach((v) => { if (v.base?.historicos) v.base.historicos = v.base.historicos.map((n) => (n === antigo ? novo : n)); });
    });
  }

  const nomesUsados = new Set(historicos.map((h) => h.nome));
  return (
    <>
      <Secao titulo="Salários (histórico salarial)"
        descricao={<>Informe quanto a pessoa recebia em cada período. Uma faixa vale para todos os meses entre "De" e "Até". Crie um histórico separado para cada parcela que serve de base (ex.: salário fixo e comissões).</>}>
        {historicos.length === 0 && (
          <div className="vazio pequeno">
            <p>Nenhum histórico ainda. Comece pelo salário base:</p>
          </div>
        )}
        {historicos.map((h, i) => (
          <div key={i} className="cartao">
            <div className="cartao-cabeca">
              <input className="titulo-editavel" aria-label="Nome do histórico" value={h.nome} onChange={(e) => renomear(i, e.target.value)} />
              <label className="check"><input type="checkbox" checked={h.incidencias?.fgts ?? true} onChange={(e) => mudarHist(i, (x) => { x.incidencias = { ...x.incidencias, fgts: e.target.checked }; })} /> Incide FGTS</label>
              <label className="check"><input type="checkbox" checked={h.incidencias?.inss ?? true} onChange={(e) => mudarHist(i, (x) => { x.incidencias = { ...x.incidencias, inss: e.target.checked }; })} /> Incide INSS</label>
              <button type="button" className="botao-link perigo" onClick={() => alterar((s) => { s.historicoSalarial!.splice(i, 1); })}>Remover histórico</button>
            </div>
            <table className="tabela">
              <thead>
                <tr><th>De</th><th>Até</th><th>Valor mensal</th><th title="FGTS já depositado sobre este valor">FGTS recolhido</th><th title="INSS já recolhido sobre este valor">INSS recolhido</th><th /></tr>
              </thead>
              <tbody>
                {h.periodos.map((p, j) => (
                  <LinhaPeriodo key={j} i={i} j={j} p={p}
                    aoMudar={(fn) => mudarHist(i, (x) => fn(x.periodos[j]))}
                    aoRemover={() => mudarHist(i, (x) => { x.periodos.splice(j, 1); })} />
                ))}
              </tbody>
            </table>
            <div className="acoes-linha">
              <button type="button" className="botao secundario pequeno" onClick={() => mudarHist(i, (x) => {
                const ultimo = x.periodos[x.periodos.length - 1];
                const de = ultimo ? proximoMes(ultimo.ate) : (spec.contrato?.admissao?.slice(0, 7) ?? '');
                x.periodos.push({ de, ate: de, valor: ultimo?.valor ?? '', fgtsRecolhido: ultimo?.fgtsRecolhido, inssRecolhido: ultimo?.inssRecolhido });
              })}>+ Faixa</button>
              <button type="button" className="botao-link" onClick={() => { setColando(colando === i ? null : i); setTextoColado(''); setInfoColagem(null); }}>Colar do Excel</button>
            </div>
            {colando === i && (
              <div className="colagem">
                <p className="dica">Cole linhas no formato <code>03/2019  12/2021  3.000,00</code> (início, fim, valor) ou <code>03/2019  3.000,00</code> (um mês). Colunas separadas por tabulação ou ";".</p>
                <textarea rows={6} value={textoColado} onChange={(e) => setTextoColado(e.target.value)} aria-label="Linhas coladas" />
                <div className="acoes-linha">
                  <button type="button" className="botao primario pequeno" onClick={() => {
                    const { periodos, ignoradas } = lerColagem(textoColado);
                    mudarHist(i, (x) => { x.periodos.push(...periodos); });
                    setInfoColagem(`${periodos.length} faixa(s) adicionada(s)${ignoradas ? `, ${ignoradas} linha(s) não reconhecida(s)` : ''}.`);
                    setTextoColado('');
                  }}>Adicionar linhas</button>
                  {infoColagem && <span className="dica">{infoColagem}</span>}
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="acoes-linha">
          {SUGESTOES.filter((n) => !nomesUsados.has(n)).slice(0, historicos.length ? 3 : 1).map((n) => (
            <button key={n} type="button" className="botao secundario" onClick={() => adicionarHistorico(n)}>+ {n}</button>
          ))}
          <button type="button" className="botao-link" onClick={() => adicionarHistorico(`Histórico ${historicos.length + 1}`)}>+ Outro histórico</button>
        </div>
      </Secao>
    </>
  );
}
