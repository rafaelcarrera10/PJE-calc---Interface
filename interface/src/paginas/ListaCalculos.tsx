import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ErroDaApi } from '../api';
import type { CalculoResumo, Especificacao } from '../tipos';
import { formatarQuando } from '../util/formatos';

const STATUS: Record<CalculoResumo['status'], string> = { rascunho: 'Rascunho', valido: 'Pronto para liquidar', liquidado: 'Liquidado' };

export function ListaCalculos() {
  const [itens, setItens] = useState<CalculoResumo[] | null>(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<string | null>(null);
  const navegar = useNavigate();
  const arquivo = useRef<HTMLInputElement>(null);

  const carregar = (b = busca) => api.listarCalculos(b).then(setItens).catch((e) => setErro(e.message));
  useEffect(() => { const t = setTimeout(() => carregar(busca), 250); return () => clearTimeout(t); }, [busca]);

  async function novo() {
    const spec: Especificacao = { versaoEspecificacao: '1.0', _titulo: 'Novo cálculo' };
    const { dados } = await api.criarCalculo(spec);
    navegar(`/calculos/${dados.id}/processo`);
  }

  async function importarJson(f: File) {
    setErro(null);
    try {
      const spec = JSON.parse(await f.text());
      const { dados } = await api.criarCalculo(spec);
      navegar(`/calculos/${dados.id}/revisao`);
    } catch (e) {
      setErro(e instanceof ErroDaApi ? `${e.problema.title}. ${e.problema.detail ?? ''}` : 'Arquivo JSON inválido.');
    }
  }

  return (
    <main className="pagina">
      <div className="pagina-topo">
        <div>
          <h1>Meus cálculos</h1>
          <p className="sub">Monte o cálculo passo a passo. O PJe-Calc oficial faz a conta quando você liquidar.</p>
        </div>
        <div className="acoes">
          <button type="button" className="botao secundario" onClick={() => arquivo.current?.click()}>Importar especificação (.json)</button>
          <input ref={arquivo} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importarJson(f); e.target.value = ''; }} />
          <button type="button" className="botao primario" onClick={novo}>+ Novo cálculo</button>
        </div>
      </div>

      <input className="busca" type="search" placeholder="Buscar por processo, reclamante ou reclamado…" value={busca}
        onChange={(e) => setBusca(e.target.value)} aria-label="Buscar cálculos" />

      {erro && <div className="aviso-faixa erro">{erro}</div>}

      {itens === null ? <p className="carregando">Carregando…</p> : itens.length === 0 ? (
        <div className="vazio">
          <h2>{busca ? 'Nada encontrado' : 'Nenhum cálculo ainda'}</h2>
          {!busca && <p>Comece com <strong>+ Novo cálculo</strong>. Você pode parar a qualquer momento: tudo é salvo automaticamente.</p>}
        </div>
      ) : (
        <ul className="lista-calculos">
          {itens.map((c) => (
            <li key={c.id} className="cartao-calculo">
              <button type="button" className="cartao-principal" onClick={() => navegar(`/calculos/${c.id}/processo`)}>
                <div className="cartao-titulo">
                  {c.reclamante ? `${c.reclamante}${c.reclamado ? ` × ${c.reclamado}` : ''}` : c.titulo ?? 'Cálculo sem nome'}
                </div>
                <div className="cartao-meta">
                  <span>{c.numeroProcesso ?? 'Sem número de processo'}</span>
                  {c.regional && <span>{c.regional}</span>}
                  <span>{c.quantidadeVerbas} verba(s)</span>
                  <span>versão {c.versao} · {formatarQuando(c.atualizadoEm)}</span>
                </div>
              </button>
              <span className={`selo selo-${c.status}`}>{STATUS[c.status]}</span>
              <div className="cartao-acoes">
                <button type="button" className="botao-link" onClick={async () => { await api.duplicarCalculo(c.id); carregar(); }}>Duplicar</button>
                {confirmarExclusao === c.id ? (
                  <>
                    <button type="button" className="botao-link perigo" onClick={async () => { await api.excluirCalculo(c.id); setConfirmarExclusao(null); carregar(); }}>Confirmar exclusão</button>
                    <button type="button" className="botao-link" onClick={() => setConfirmarExclusao(null)}>Cancelar</button>
                  </>
                ) : (
                  <button type="button" className="botao-link perigo" onClick={() => setConfirmarExclusao(c.id)}>Excluir</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
