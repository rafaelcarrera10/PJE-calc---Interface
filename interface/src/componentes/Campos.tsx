// Campos de formulário em linguagem simples, com ajuda e mensagens da validação no lugar certo.
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useProblema } from '../paginas/contextoEditor';
import { formatarDecimal, formatarDinheiro, lerDecimal, lerDinheiro } from '../util/formatos';
import type { Opcao } from '../tipos';

interface Base {
  rotulo: string;
  ajuda?: ReactNode;
  caminho?: string;
  obrigatorio?: boolean;
  largura?: 'p' | 'm' | 'g';
}

function Moldura({ rotulo, ajuda, caminho, obrigatorio, largura = 'm', id, children, erroLocal }: Base & { id: string; children: ReactNode; erroLocal?: string }) {
  const { erro, aviso } = useProblema(caminho);
  const [mostrarAjuda, setMostrarAjuda] = useState(false);
  const msgErro = erroLocal ?? erro;
  return (
    <div className={`campo campo-${largura} ${msgErro ? 'com-erro' : aviso ? 'com-aviso' : ''}`} data-caminho={caminho}>
      <div className="campo-topo">
        <label htmlFor={id}>
          {rotulo}
          {obrigatorio && <span className="obrigatorio" aria-hidden="true"> *</span>}
        </label>
        {ajuda && (
          <button type="button" className="botao-ajuda" aria-label={`O que é ${rotulo}?`} aria-expanded={mostrarAjuda}
            onClick={() => setMostrarAjuda((v) => !v)}>?</button>
        )}
      </div>
      {mostrarAjuda && <div className="ajuda">{ajuda}</div>}
      {children}
      {msgErro && <div className="msg msg-erro" role="alert">{msgErro}</div>}
      {!msgErro && aviso && <div className="msg msg-aviso">{aviso}</div>}
    </div>
  );
}

export function CampoTexto(p: Base & { valor?: string; aoMudar: (v: string | undefined) => void; placeholder?: string; mascara?: (v: string) => string }) {
  const id = useId();
  return (
    <Moldura {...p} id={id}>
      <input id={id} type="text" value={p.valor ?? ''} placeholder={p.placeholder}
        onChange={(e) => {
          const v = p.mascara ? p.mascara(e.target.value) : e.target.value;
          p.aoMudar(v === '' ? undefined : v);
        }} />
    </Moldura>
  );
}

export function CampoData(p: Base & { valor?: string; aoMudar: (v: string | undefined) => void }) {
  const id = useId();
  return (
    <Moldura {...p} id={id} largura={p.largura ?? 'p'}>
      <input id={id} type="date" value={p.valor ?? ''} onChange={(e) => p.aoMudar(e.target.value || undefined)} />
    </Moldura>
  );
}

export function CampoCompetencia(p: Base & { valor?: string; aoMudar: (v: string | undefined) => void }) {
  const id = useId();
  return (
    <Moldura {...p} id={id} largura={p.largura ?? 'p'}>
      <input id={id} type="month" value={p.valor ?? ''} onChange={(e) => p.aoMudar(e.target.value || undefined)} />
    </Moldura>
  );
}

/** Texto com máscara pt-BR; envia decimal com ponto. Só confirma ao sair do campo. */
export function CampoDinheiro(p: Base & { valor?: string; aoMudar: (v: string | undefined) => void }) {
  const id = useId();
  const [texto, setTexto] = useState(formatarDinheiro(p.valor));
  const [invalido, setInvalido] = useState(false);
  useEffect(() => { setTexto(formatarDinheiro(p.valor)); }, [p.valor]);
  return (
    <Moldura {...p} id={id} largura={p.largura ?? 'p'} erroLocal={invalido ? 'Valor inválido. Exemplo: 3.500,00' : undefined}>
      <div className="com-prefixo">
        <span>R$</span>
        <input id={id} inputMode="decimal" value={texto} placeholder="0,00"
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => {
            const v = lerDinheiro(texto);
            if (v === null) { setInvalido(true); return; }
            setInvalido(false);
            p.aoMudar(v);
            setTexto(formatarDinheiro(v));
          }} />
      </div>
    </Moldura>
  );
}

export function CampoDecimal(p: Base & { valor?: string; aoMudar: (v: string | undefined) => void; sufixo?: string; placeholder?: string }) {
  const id = useId();
  const [texto, setTexto] = useState(formatarDecimal(p.valor));
  const [invalido, setInvalido] = useState(false);
  useEffect(() => { setTexto(formatarDecimal(p.valor)); }, [p.valor]);
  return (
    <Moldura {...p} id={id} largura={p.largura ?? 'p'} erroLocal={invalido ? 'Número inválido.' : undefined}>
      <div className="com-prefixo">
        <input id={id} inputMode="decimal" value={texto} placeholder={p.placeholder}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => {
            const v = lerDecimal(texto);
            if (v === null) { setInvalido(true); return; }
            setInvalido(false);
            p.aoMudar(v);
          }} />
        {p.sufixo && <span>{p.sufixo}</span>}
      </div>
    </Moldura>
  );
}

export function CampoInteiro(p: Base & { valor?: number; aoMudar: (v: number | undefined) => void; min?: number }) {
  const id = useId();
  return (
    <Moldura {...p} id={id} largura={p.largura ?? 'p'}>
      <input id={id} type="number" min={p.min ?? 0} step={1} value={p.valor ?? ''}
        onChange={(e) => p.aoMudar(e.target.value === '' ? undefined : Number(e.target.value))} />
    </Moldura>
  );
}

export function CampoSelecao(p: Base & { valor?: string; opcoes: Opcao[]; aoMudar: (v: string | undefined) => void; vazio?: string }) {
  const id = useId();
  const atual = p.opcoes.find((o) => o.valor === p.valor);
  return (
    <Moldura {...p} id={id}>
      <select id={id} value={p.valor ?? ''} onChange={(e) => p.aoMudar(e.target.value || undefined)}>
        <option value="">{p.vazio ?? 'Selecione…'}</option>
        {p.opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
      {atual?.ajuda && <div className="dica">{atual.ajuda}</div>}
    </Moldura>
  );
}

/** Sim/Não explícito (melhor que checkbox para decisões jurídicas). */
export function CampoSimNao(p: Base & { valor?: boolean; aoMudar: (v: boolean) => void; padrao?: boolean }) {
  const id = useId();
  const v = p.valor ?? p.padrao;
  return (
    <Moldura {...p} id={id}>
      <div className="sim-nao" role="radiogroup" aria-labelledby={id}>
        <button type="button" id={id} className={v === true ? 'ativo' : ''} aria-pressed={v === true} onClick={() => p.aoMudar(true)}>Sim</button>
        <button type="button" className={v === false ? 'ativo' : ''} aria-pressed={v === false} onClick={() => p.aoMudar(false)}>Não</button>
      </div>
    </Moldura>
  );
}

export function Secao({ titulo, descricao, children, acoes }: { titulo: string; descricao?: ReactNode; children: ReactNode; acoes?: ReactNode }) {
  return (
    <section className="secao">
      <div className="secao-topo">
        <div>
          <h2>{titulo}</h2>
          {descricao && <p className="secao-descricao">{descricao}</p>}
        </div>
        {acoes}
      </div>
      {children}
    </section>
  );
}

export const Linha = ({ children }: { children: ReactNode }) => <div className="linha">{children}</div>;
