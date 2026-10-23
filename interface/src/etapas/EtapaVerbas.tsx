import { useMemo, useState } from 'react';
import { CampoData, CampoDecimal, CampoDinheiro, CampoSelecao, CampoTexto, Linha, Secao } from '../componentes/Campos';
import { useEditor, useProblema } from '../paginas/contextoEditor';
import type { Verba, VerbaCatalogo } from '../tipos';
import { maiorData, somarAnos } from '../util/formatos';

/** Verbas apuradas por hora (divisor × multiplicador × quantidade): HE, adicional noturno, intervalos, sobreaviso. */
const ehPorHora = (c?: VerbaCatalogo) => !!c && !c.divisorPadrao && !!c.multiplicadorPadrao && !c.nome.includes('COMISSIONISTA');

const OCORRENCIA: Record<string, string> = { mensal: 'Mensal', dezembro: 'Anual (dezembro)', desligamento: 'Na rescisão', periodo_aquisitivo: 'Por período aquisitivo' };
const TIPOS_BASE = [
  { valor: 'historico_salarial', rotulo: 'Histórico salarial' },
  { valor: 'maior_remuneracao', rotulo: 'Maior remuneração' },
  { valor: 'salario_minimo', rotulo: 'Salário mínimo' },
  { valor: 'piso_categoria', rotulo: 'Piso da categoria' },
  { valor: 'valor_informado', rotulo: 'Valor informado' },
];
const TIPOS_DIVISOR = [
  { valor: 'carga_horaria', rotulo: 'Carga horária mensal', ajuda: 'Ex.: 220. Usado em horas extras e adicionais por hora.' },
  { valor: 'dias_uteis', rotulo: 'Dias úteis do mês' },
  { valor: 'informado', rotulo: 'Valor informado' },
];
const TIPOS_QTD = [
  { valor: 'informada', rotulo: 'Quantidade fixa por mês', ajuda: 'Ex.: 20 horas extras por mês, conforme a sentença.' },
  { valor: 'calendario', rotulo: 'Calendário (dias do mês)' },
  { valor: 'cartao_de_ponto', rotulo: 'Cartão de ponto', ajuda: 'Disponível quando o cartão de ponto for implementado.' },
];

function Incidencias({ c }: { c?: VerbaCatalogo }) {
  if (!c) return null;
  const itens = [['FGTS', c.incidencias.fgts], ['INSS', c.incidencias.inss], ['IR', c.incidencias.irpf]] as const;
  return (
    <span className="incidencias" title="Incidências padrão do PJe-Calc para esta verba">
      {itens.map(([n, v]) => <span key={n} className={`etiqueta ${v ? 'sim' : 'nao'}`}>{v ? '✓' : '—'} {n}</span>)}
    </span>
  );
}

function CartaoVerba({ v, i, c }: { v: Verba; i: number; c?: VerbaCatalogo }) {
  const { spec, alterar } = useEditor();
  const raiz = `/verbas/${i}`;
  const { erro: erroNome, aviso: avisoNome } = useProblema(`${raiz}/catalogo`);
  const [aberta, setAberta] = useState(true);
  const set = (fn: (x: Verba) => void) => alterar((s) => { fn(s.verbas![i]); });
  const historicos = (spec.historicoSalarial ?? []).map((h) => h.nome);
  const reflexosMarcados = new Set((v.reflexos ?? []).map((r) => r.catalogo));
  const porHora = ehPorHora(c);

  return (
    <div className={`cartao verba ${erroNome ? 'com-erro' : ''}`}>
      <div className="cartao-cabeca">
        <button type="button" className="expandir" aria-expanded={aberta} onClick={() => setAberta((a) => !a)}>{aberta ? '▾' : '▸'}</button>
        <div className="verba-nome">
          <strong>{v.catalogo ?? 'Verba personalizada'}</strong>
          {c && <span className="etiqueta neutra">{OCORRENCIA[c.ocorrencia] ?? c.ocorrencia}</span>}
          <Incidencias c={c} />
        </div>
        <button type="button" className="botao-link perigo" onClick={() => alterar((s) => { s.verbas!.splice(i, 1); })}>Remover</button>
      </div>
      {(erroNome || avisoNome) && <div className={`msg ${erroNome ? 'msg-erro' : 'msg-aviso'}`}>{erroNome ?? avisoNome}</div>}
      {aberta && (
        <div className="cartao-corpo">
          <Linha>
            <CampoData rotulo="Devida de" valor={v.periodo?.inicio} caminho={`${raiz}/periodo/inicio`}
              aoMudar={(d) => set((x) => { x.periodo = { inicio: d ?? '', fim: x.periodo?.fim ?? '' }; })} />
            <CampoData rotulo="até" valor={v.periodo?.fim} caminho={`${raiz}/periodo/fim`}
              aoMudar={(d) => set((x) => { x.periodo = { inicio: x.periodo?.inicio ?? '', fim: d ?? '' }; })} />
            <CampoTexto rotulo="Fonte (opcional)" valor={v._fonte} placeholder="Ex.: sentença, fl. 230" largura="g"
              ajuda="Anote de onde veio a decisão. Fica no histórico do cálculo e não vai para o PJe-Calc."
              aoMudar={(t) => set((x) => { x._fonte = t; })} />
          </Linha>
          <Linha>
            <CampoSelecao rotulo="Base de cálculo" valor={v.base?.tipo} opcoes={TIPOS_BASE} caminho={`${raiz}/base/tipo`}
              aoMudar={(t) => set((x) => { x.base = { ...x.base, tipo: t }; })} />
            {v.base?.tipo === 'historico_salarial' && (
              <CampoSelecao rotulo="Qual histórico" valor={v.base.historicos?.[0]} vazio={historicos.length ? 'Selecione…' : 'Cadastre em "Salários"'}
                opcoes={historicos.map((n) => ({ valor: n, rotulo: n }))} caminho={`${raiz}/base/historicos/0`}
                aoMudar={(n) => set((x) => { x.base = { ...x.base, historicos: n ? [n] : [] }; })} />
            )}
            {v.base?.tipo === 'valor_informado' && (
              <CampoDinheiro rotulo="Valor da base" valor={v.base.valor} caminho={`${raiz}/base/valor`}
                aoMudar={(n) => set((x) => { x.base = { ...x.base, valor: n }; })} />
            )}
          </Linha>
          <Linha>
            {(porHora || v.divisor) && (
              <>
                <CampoSelecao rotulo="Divisor" valor={v.divisor?.tipo} opcoes={TIPOS_DIVISOR} caminho={`${raiz}/divisor/tipo`}
                  aoMudar={(t) => set((x) => { x.divisor = { ...x.divisor, tipo: t, valor: t === 'carga_horaria' ? (x.divisor?.valor ?? spec.parametros?.cargaHorariaMensal ?? '220') : x.divisor?.valor }; })} />
                {(v.divisor?.tipo === 'carga_horaria' || v.divisor?.tipo === 'informado') && (
                  <CampoDecimal rotulo="Valor do divisor" valor={v.divisor?.valor} caminho={`${raiz}/divisor/valor`}
                    aoMudar={(n) => set((x) => { x.divisor = { ...x.divisor, valor: n }; })} />
                )}
              </>
            )}
            <CampoDecimal rotulo="Multiplicador" valor={v.multiplicador} placeholder={c?.multiplicadorPadrao ? String(Number(c.multiplicadorPadrao)).replace('.', ',') : '1'}
              caminho={`${raiz}/multiplicador`}
              ajuda="Ex.: 1,5 para horas extras de 50%; 0,2 para adicional de 20%. Em branco = padrão do PJe-Calc."
              aoMudar={(n) => set((x) => { x.multiplicador = n; })} />
            {(porHora || v.quantidade) && (
              <>
                <CampoSelecao rotulo="Quantidade" valor={v.quantidade?.tipo} opcoes={TIPOS_QTD} caminho={`${raiz}/quantidade/tipo`}
                  aoMudar={(t) => set((x) => { x.quantidade = { ...x.quantidade, tipo: t }; })} />
                {v.quantidade?.tipo === 'informada' && (
                  <CampoDecimal rotulo="Quantidade por mês" valor={v.quantidade.valor} sufixo="h" caminho={`${raiz}/quantidade/valor`}
                    aoMudar={(n) => set((x) => { x.quantidade = { ...x.quantidade, valor: n }; })} />
                )}
              </>
            )}
          </Linha>
          {c && c.reflexosDisponiveis.length > 0 && (
            <div className="reflexos">
              <div className="rotulo-grupo">Reflexos <span className="dica">— marque onde esta verba repercute</span></div>
              <div className="fichas">
                {c.reflexosDisponiveis.map((r) => (
                  <button key={r} type="button" className={`ficha ${reflexosMarcados.has(r) ? 'marcada' : ''}`} aria-pressed={reflexosMarcados.has(r)}
                    onClick={() => set((x) => {
                      const atual = x.reflexos ?? [];
                      x.reflexos = reflexosMarcados.has(r) ? atual.filter((y) => y.catalogo !== r) : [...atual, { catalogo: r }];
                      if (!x.reflexos.length) delete x.reflexos;
                    })}>
                    {reflexosMarcados.has(r) ? '✓ ' : '+ '}{r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EtapaVerbas() {
  const { spec, alterar, catalogos } = useEditor();
  const [busca, setBusca] = useState('');
  const verbas = spec.verbas ?? [];
  const mapa = useMemo(() => new Map(catalogos.verbas.map((v) => [v.nome, v])), [catalogos.verbas]);
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const resultados = busca.trim() ? catalogos.verbas.filter((v) => norm(v.nome).includes(norm(busca))).slice(0, 12) : [];

  function adicionar(c: VerbaCatalogo) {
    alterar((s) => {
      const ct = s.contrato ?? {};
      const marco = ct.ajuizamento && s.parametros?.prescricao?.quinquenal !== false ? somarAnos(ct.ajuizamento, -5) : undefined;
      const inicio = maiorData(ct.admissao, marco);
      const nova: Verba = { catalogo: c.nome };
      if (c.ocorrencia === 'mensal' && inicio && ct.demissao) nova.periodo = { inicio, fim: ct.demissao };
      const primeiroHist = s.historicoSalarial?.[0]?.nome;
      if (primeiroHist && c.ocorrencia !== 'desligamento') nova.base = { tipo: 'historico_salarial', historicos: [primeiroHist] };
      if (ehPorHora(c)) {
        nova.divisor = { tipo: 'carga_horaria', valor: s.parametros?.cargaHorariaMensal ?? '220' };
        nova.quantidade = { tipo: 'informada' };
      }
      s.verbas = [...(s.verbas ?? []), nova];
    });
    setBusca('');
  }

  return (
    <Secao titulo="Verbas deferidas"
      descricao={<>Busque as verbas na biblioteca do PJe-Calc (as mesmas do “Lançamento Expresso”) e marque os reflexos. <span className="dica">{catalogos.verbasOrigem}</span></>}>
      <div className="busca-verbas">
        <input type="search" placeholder="Buscar verba: horas extras, insalubridade, aviso prévio…" value={busca}
          onChange={(e) => setBusca(e.target.value)} aria-label="Buscar verba no catálogo" />
        {resultados.length > 0 && (
          <ul className="sugestoes" role="listbox">
            {resultados.map((v) => (
              <li key={v.nome}>
                <button type="button" onClick={() => adicionar(v)}>
                  <strong>{v.nome}</strong>
                  <span className="dica">{OCORRENCIA[v.ocorrencia] ?? v.ocorrencia}{v.reflexosDisponiveis.length ? ` · ${v.reflexosDisponiveis.length} reflexos possíveis` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {busca.trim() && resultados.length === 0 && <p className="dica">Nenhuma verba encontrada com “{busca}”.</p>}
      </div>
      {verbas.length === 0 ? (
        <div className="vazio pequeno"><p>Nenhuma verba ainda. Exemplos comuns: <em>HORAS EXTRAS 50%</em>, <em>ADICIONAL DE INSALUBRIDADE 20%</em>, <em>AVISO PRÉVIO</em>.</p></div>
      ) : verbas.map((v, i) => <CartaoVerba key={i} v={v} i={i} c={v.catalogo ? mapa.get(v.catalogo) : undefined} />)}
    </Secao>
  );
}
