// Erros no formato RFC 9457 (application/problem+json) — docs/06-api/jobs-e-erros.md
import type { FastifyReply } from 'fastify';

export interface ItemErro {
  caminho: string;
  codigo: string;
  mensagem: string;
  origem?: 'api' | 'pjecalc';
  mensagemOriginal?: string;
}

export class ErroApi extends Error {
  constructor(
    public status: number,
    public codigo: string,
    public titulo: string,
    public detalhe?: string,
    public erros?: ItemErro[],
    public extras?: Record<string, unknown>,
  ) {
    super(titulo);
  }
}

export function enviarProblema(reply: FastifyReply, e: ErroApi) {
  return reply
    .status(e.status)
    .type('application/problem+json')
    .send({
      type: `about:blank#${e.codigo.toLowerCase()}`,
      title: e.titulo,
      status: e.status,
      codigo: e.codigo,
      ...(e.detalhe ? { detail: e.detalhe } : {}),
      ...(e.erros ? { erros: e.erros } : {}),
      ...(e.extras ?? {}),
      traceId: reply.request.id,
    });
}

export const naoEncontrado = (o = 'Recurso') => new ErroApi(404, 'NAO_ENCONTRADO', `${o} não encontrado`);
