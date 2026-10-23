import { createContext, useContext } from 'react';
import type { Especificacao, ItemErro, Opcao, VerbaCatalogo } from '../tipos';

export interface Catalogos {
  verbas: VerbaCatalogo[];
  verbasOrigem: string;
  indices: Opcao[];
  juros: Opcao[];
  tiposRescisao: Opcao[];
  regionais: Opcao[];
  ufs: Opcao[];
}

export interface ContextoEditor {
  id: string;
  spec: Especificacao;
  /** Altera a especificação; o salvamento é automático. */
  alterar: (fn: (rascunho: Especificacao) => void) => void;
  erros: ItemErro[];
  avisos: ItemErro[];
  catalogos: Catalogos;
  irPara: (etapa: string) => void;
  validarAgora: () => Promise<void>;
}

export const Contexto = createContext<ContextoEditor | null>(null);

export function useEditor(): ContextoEditor {
  const c = useContext(Contexto);
  if (!c) throw new Error('useEditor fora do Editor');
  return c;
}

/** Erro/aviso exatamente neste caminho (JSON Pointer). */
export function useProblema(caminho?: string): { erro?: string; aviso?: string } {
  const { erros, avisos } = useEditor();
  if (!caminho) return {};
  return {
    erro: erros.find((e) => e.caminho === caminho)?.mensagem,
    aviso: avisos.find((e) => e.caminho === caminho)?.mensagem,
  };
}
