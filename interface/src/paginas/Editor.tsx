// Editor do cálculo: assistente por etapas, salvamento automático (PATCH + If-Match) e validação contínua.
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ErroDaApi } from '../api';
import type { Especificacao, ResultadoValidacao } from '../tipos';
import { criarMergePatch } from '../util/mergePatch';
import { Contexto, type Catalogos, type ContextoEditor } from './contextoEditor';
import { ETAPAS, etapaDoCaminho, type EtapaMeta } from './etapasMeta';
import { EtapaProcesso } from '../etapas/EtapaProcesso';
import { EtapaContrato } from '../etapas/EtapaContrato';
import { EtapaParametros } from '../etapas/EtapaParametros';
import { EtapaSalarios } from '../etapas/EtapaSalarios';
import { EtapaVerbas } from '../etapas/EtapaVerbas';
import { EtapaAusencias } from '../etapas/EtapaAusencias';
import { EtapaEncargos } from '../etapas/EtapaEncargos';
import { EtapaCorrecao } from '../etapas/EtapaCorrecao';
import { EtapaRevisao } from '../etapas/EtapaRevisao';
import { EtapaResultado } from '../etapas/EtapaResultado';

const COMPONENTES: Record<string, ComponentType> = {
  processo: EtapaProcesso, contrato: EtapaContrato, parametros: EtapaParametros, salarios: EtapaSalarios,
  verbas: EtapaVerbas, ausencias: EtapaAusencias, encargos: EtapaEncargos, correcao: EtapaCorrecao,
  revisao: EtapaRevisao, resultado: EtapaResultado,
};

type EstadoSalvamento = 'salvo' | 'pendente' | 'salvando' | 'erro' | 'conflito';

export function Editor() {
  const { id = '', etapa = 'processo' } = useParams();
  const navegar = useNavigate();
  const [spec, setSpec] = useState<Especificacao | null>(null);
  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState<EstadoSalvamento>('salvo');
  const [validacao, setValidacao] = useState<ResultadoValidacao | null>(null);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const salvo = useRef<Especificacao | null>(null);
  const etag = useRef<string>('');
  const salvando = useRef(false);
  const atual = useRef<Especificacao | null>(null);
  const timerSalvar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timerValidar = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const validarAgora = useCallback(async () => {
    try { setValidacao(await api.validar(id)); } catch { /* sem efeito */ }
  }, [id]);

  // Carga inicial
  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.obterCalculo(id),
      api.catalogoVerbas(),
      api.catalogo('indices-correcao'),
      api.catalogo('juros'),
      api.catalogo('tipos-rescisao'),
      api.catalogo('regionais'),
      api.catalogo('ufs'),
    ]).then(([c, verbas, indices, juros, tiposRescisao, regionais, ufs]) => {
      if (!ativo) return;
      salvo.current = c.dados.especificacao;
      atual.current = c.dados.especificacao;
      etag.current = c.etag ?? `"v${c.dados.versao}"`;
      setSpec(c.dados.especificacao);
      setVersao(c.dados.versao);
      setValidacao(c.dados.ultimaValidacao);
      setCatalogos({ verbas: verbas.verbas, verbasOrigem: verbas.origem, indices, juros, tiposRescisao, regionais, ufs });
      validarAgora();
    }).catch((e) => setErroCarga(e instanceof ErroDaApi ? e.problema.title : String(e)));
    return () => { ativo = false; };
  }, [id, validarAgora]);

  const salvar = useCallback(async () => {
    if (salvando.current || !atual.current || !salvo.current) return;
    const patch = criarMergePatch(salvo.current, atual.current);
    if (patch === undefined) { setEstado('salvo'); return; }
    salvando.current = true;
    setEstado('salvando');
    const enviado = atual.current;
    try {
      const r = await api.alterarCalculo(id, patch, etag.current);
      salvo.current = enviado;
      etag.current = r.etag ?? `"v${r.dados.versao}"`;
      setVersao(r.dados.versao);
      setEstado(atual.current === enviado ? 'salvo' : 'pendente');
      clearTimeout(timerValidar.current);
      timerValidar.current = setTimeout(validarAgora, 600);
    } catch (e) {
      setEstado(e instanceof ErroDaApi && e.status === 409 ? 'conflito' : 'erro');
    } finally {
      salvando.current = false;
      if (atual.current !== enviado) { clearTimeout(timerSalvar.current); timerSalvar.current = setTimeout(salvar, 300); }
    }
  }, [id, validarAgora]);

  const alterar = useCallback((fn: (r: Especificacao) => void) => {
    setSpec((anterior) => {
      if (!anterior) return anterior;
      const rascunho = structuredClone(anterior);
      fn(rascunho);
      atual.current = rascunho;
      return rascunho;
    });
    setEstado('pendente');
    clearTimeout(timerSalvar.current);
    timerSalvar.current = setTimeout(salvar, 700);
  }, [salvar]);

  // Salva antes de sair da página.
  useEffect(() => () => { clearTimeout(timerSalvar.current); void salvar(); }, [salvar]);

  const irPara = useCallback((e: string) => navegar(`/calculos/${id}/${e}`), [id, navegar]);

  const ctx = useMemo<ContextoEditor | null>(() => spec && catalogos ? {
    id, spec, alterar, catalogos, irPara, validarAgora,
    erros: validacao?.erros ?? [], avisos: validacao?.avisos ?? [],
  } : null, [id, spec, alterar, catalogos, irPara, validarAgora, validacao]);

  if (erroCarga) return <main className="pagina"><div className="aviso-faixa erro">Não foi possível abrir o cálculo: {erroCarga}</div></main>;
  if (!ctx) return <main className="pagina"><p className="carregando">Abrindo cálculo…</p></main>;

  const indice = Math.max(0, ETAPAS.findIndex((e) => e.chave === etapa));
  const Atual = COMPONENTES[ETAPAS[indice].chave];
  const contar = (lista: { caminho: string }[], e: EtapaMeta) => lista.filter((x) => etapaDoCaminho(x.caminho) === e.chave && e.prefixos.length).length;
  const titulo = ctx.spec.partes?.reclamante?.nome
    ? `${ctx.spec.partes.reclamante.nome}${ctx.spec.partes.reclamado?.nome ? ` × ${ctx.spec.partes.reclamado.nome}` : ''}`
    : ctx.spec._titulo ?? 'Cálculo';

  return (
    <Contexto.Provider value={ctx}>
      <div className="editor">
        <aside className="etapas" aria-label="Etapas do cálculo">
          <button type="button" className="voltar" onClick={() => navegar('/')}>← Meus cálculos</button>
          <div className="editor-titulo" title={titulo}>{titulo}</div>
          <div className={`salvamento salvamento-${estado}`} aria-live="polite">
            {{ salvo: `✓ Salvo · versão ${versao}`, pendente: 'Alterações não salvas…', salvando: 'Salvando…', erro: 'Erro ao salvar — tentando de novo ao editar', conflito: 'Alterado em outra aba — recarregue a página' }[estado]}
          </div>
          <ol>
            {ETAPAS.map((e, i) => {
              const nErros = contar(ctx.erros, e);
              const nAvisos = contar(ctx.avisos, e);
              return (
                <li key={e.chave}>
                  <button type="button" className={`etapa ${i === indice ? 'atual' : ''}`} onClick={() => irPara(e.chave)} aria-current={i === indice ? 'step' : undefined}>
                    <span className="etapa-numero">{i + 1}</span>
                    <span className="etapa-texto">
                      <span className="etapa-titulo">{e.titulo}</span>
                      <span className="etapa-resumo">{e.resumo}</span>
                    </span>
                    {nErros > 0 ? <span className="contador erro" title={`${nErros} pendência(s)`}>{nErros}</span>
                      : nAvisos > 0 ? <span className="contador aviso" title={`${nAvisos} aviso(s)`}>{nAvisos}</span> : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
        <main className="conteudo-etapa">
          {estado === 'conflito' && (
            <div className="aviso-faixa erro">Este cálculo foi alterado em outra janela. <button type="button" className="botao-link" onClick={() => location.reload()}>Recarregar</button></div>
          )}
          <Atual />
          <nav className="navegacao-etapas">
            {indice > 0 ? <button type="button" className="botao secundario" onClick={() => irPara(ETAPAS[indice - 1].chave)}>← {ETAPAS[indice - 1].titulo}</button> : <span />}
            {indice < ETAPAS.length - 1 && <button type="button" className="botao primario" onClick={() => irPara(ETAPAS[indice + 1].chave)}>{ETAPAS[indice + 1].titulo} →</button>}
          </nav>
        </main>
      </div>
    </Contexto.Provider>
  );
}
