import { useEffect, useState } from 'react';
import { api, ErroDaApi } from '../api';
import { CampoData, Linha, Secao } from '../componentes/Campos';
import { useEditor } from '../paginas/contextoEditor';
import type { Problema } from '../tipos';
import { formatarQuando } from '../util/formatos';

function ultimoDiaDoMes() {
  const d = new Date();
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`;
}

export function EtapaResultado() {
  const { id, spec, erros, irPara } = useEditor();
  const [data, setData] = useState<string | undefined>(ultimoDiaDoMes());
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState<Problema | null>(null);
  const [versoes, setVersoes] = useState<{ numero: number; criadaEm: string; origem: string }[]>([]);
  useEffect(() => { api.versoes(id).then(setVersoes).catch(() => undefined); }, [id, spec]);

  async function liquidar() {
    if (!data) return;
    setEnviando(true);
    setResposta(null);
    try {
      await api.liquidar(id, data);
    } catch (e) {
      if (e instanceof ErroDaApi) setResposta(e.problema);
    } finally {
      setEnviando(false);
    }
  }

  function baixarJson() {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(spec.processo?.numero ?? spec._titulo ?? 'calculo').replace(/[^\w.-]+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <Secao titulo="Liquidar no PJe-Calc" descricao="A liquidação é feita pelo PJe-Calc oficial, que devolve o relatório em PDF e o arquivo .PJC para juntar ao processo.">
        <Linha>
          <CampoData rotulo="Data da liquidação" valor={data} caminho="/dataLiquidacao" obrigatorio
            ajuda="Data até a qual os valores serão corrigidos. Normalmente o último dia do mês atual." aoMudar={setData} />
          <button type="button" className="botao primario grande alinhado" disabled={!data || enviando} onClick={liquidar}>
            {enviando ? 'Enviando…' : 'Liquidar'}
          </button>
        </Linha>
        {erros.length > 0 && !resposta && (
          <div className="aviso-faixa erro">Há {erros.length} pendência(s). <button type="button" className="botao-link" onClick={() => irPara('revisao')}>Ver pendências</button></div>
        )}
        {resposta?.codigo === 'MOTOR_INDISPONIVEL' && (
          <div className="resultado-motor">
            <div className="resultado-icone" aria-hidden>⚙</div>
            <div>
              <h3>{resposta.title}</h3>
              <p>{resposta.detail}</p>
              <p className="dica">Assim que o PJe-Calc for conectado (Fase 1), este botão vai devolver aqui o resumo (bruto, líquido, FGTS, INSS, IR, honorários), o PDF e o .PJC.</p>
            </div>
          </div>
        )}
        {resposta && resposta.codigo !== 'MOTOR_INDISPONIVEL' && (
          <div className="aviso-faixa erro">
            <strong>{resposta.title}</strong>
            {resposta.erros && <ul>{resposta.erros.map((e, i) => <li key={i}>{e.mensagem}</li>)}</ul>}
          </div>
        )}
      </Secao>

      <Secao titulo="Arquivos e histórico">
        <div className="acoes-linha">
          <button type="button" className="botao secundario" onClick={baixarJson}>Baixar especificação (.json)</button>
          <span className="dica">Serve de backup ou para abrir este cálculo no outro computador (Importar especificação).</span>
        </div>
        <h3 className="subtitulo">Versões salvas</h3>
        <ul className="versoes">
          {versoes.slice(0, 15).map((v) => <li key={v.numero}><strong>v{v.numero}</strong> · {formatarQuando(v.criadaEm)} · {v.origem === 'criacao' ? 'criado' : v.origem === 'edicao' ? 'editado' : v.origem.startsWith('duplicado') ? 'duplicado de outro cálculo' : v.origem}</li>)}
        </ul>
      </Secao>
    </>
  );
}
