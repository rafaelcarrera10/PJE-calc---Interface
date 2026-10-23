// Utilitários de tela usados por todas as versões: localizar componentes e interpretar o resultado de uma ação.
import { ErroAdaptador } from './erros.js';
import { idPorTexto, normalizar, type Mensagem, type Pagina } from './html.js';

/** Link do menu identificado pela classe CSS ou pelo texto visível (os ids j_idNN mudam conforme o menu montado). */
export type ItemMenu = { texto: string } | { classe: string };

export function idMenu(pagina: Pagina, item: ItemMenu): string {
  const id = 'classe' in item
    ? pagina.raiz.querySelector(`a.${item.classe}[id]`)?.getAttribute('id')
    : idPorTexto(pagina.raiz, item.texto);
  if (!id) throw new ErroAdaptador('RESPOSTA_INESPERADA', `Item de menu não encontrado: ${JSON.stringify(item)}`, { url: pagina.url });
  return id;
}

/** Valor de um radio pelo rótulo visível exato (o value interno pode mudar entre versões; o rótulo, não). */
export function valorDoRadio(pagina: Pagina, nome: string, rotulo: string): string {
  const alvo = normalizar(rotulo).toLowerCase();
  for (const input of pagina.raiz.querySelectorAll('input[type=radio]')) {
    if (input.getAttribute('name') !== nome) continue;
    const id = input.getAttribute('id');
    const texto = normalizar((id && pagina.raiz.querySelector(`label[for="${id}"]`)?.text) || input.parentNode?.text || '').toLowerCase();
    if (texto === alvo) return input.getAttribute('value') ?? '';
  }
  throw new ErroAdaptador('RESPOSTA_INESPERADA', `Opção "${rotulo}" não encontrada em ${nome}`, { url: pagina.url });
}

/** Mensagem de erro na tela vira OPERACAO_RECUSADA, com o texto do PJe-Calc. */
export function exigirSemErro(mensagens: Mensagem[], operacao: string): void {
  const erros = mensagens.filter((m) => m.tipo === 'erro');
  if (erros.length) {
    throw new ErroAdaptador('OPERACAO_RECUSADA', `O PJe-Calc recusou a operação "${operacao}": ${erros.map((e) => e.texto).join(' ')}`, { mensagens });
  }
}

/** Sem erro e com a confirmação de sucesso (operações que alteram o cálculo). */
export function exigirSucesso(mensagens: Mensagem[], operacao: string): void {
  exigirSemErro(mensagens, operacao);
  if (!mensagens.some((m) => m.tipo === 'sucesso')) {
    throw new ErroAdaptador('RESPOSTA_INESPERADA', `O PJe-Calc não confirmou a operação "${operacao}"`, { mensagens });
  }
}

/** AAAA-MM-DD → DD/MM/AAAA, o formato dos campos de data das telas. */
export function dataBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new RangeError(`Data inválida (use AAAA-MM-DD): ${iso}`);
  return `${m[3]}/${m[2]}/${m[1]}`;
}
