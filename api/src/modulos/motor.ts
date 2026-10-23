// Motor (PJe-Calc). Neste protótipo NÃO há motor: nem real (Fase 1) nem simulado (decisão do usuário).
// A API valida tudo e, na hora de liquidar, responde honestamente que o motor não está conectado.
import type { FastifyInstance } from 'fastify';
import type { Banco } from '../db.js';
import { registrarEvento } from '../db.js';
import { ErroApi } from '../problemas.js';
import { obterLinha } from './calculos.js';
import { validarEspecificacao } from './validacao.js';

export type EstadoMotor = 'nao_conectado' | 'parado' | 'iniciando' | 'pronto' | 'ocupado' | 'falhou';

export function estadoDoMotor() {
  return {
    estado: 'nao_conectado' as EstadoMotor,
    mensagem: 'O adaptador do PJe-Calc ainda não foi construído (Fase 1 do roadmap). Você já pode montar e validar cálculos; a liquidação ficará disponível quando o motor for conectado.',
    versaoPjeCalc: null,
    porta: 9357,
  };
}

export function registrarMotor(app: FastifyInstance, db: Banco) {
  app.get('/v1/saude/motor', async () => estadoDoMotor());

  app.post('/v1/motor/iniciar', async () => {
    throw new ErroApi(503, 'MOTOR_INDISPONIVEL', 'O PJe-Calc ainda não está conectado', estadoDoMotor().mensagem);
  });

  app.post('/v1/calculos/:id/liquidacoes', async (req) => {
    const { id } = req.params as { id: string };
    const corpo = (req.body ?? {}) as { dataLiquidacao?: string };
    if (!corpo.dataLiquidacao || !/^\d{4}-\d{2}-\d{2}$/.test(corpo.dataLiquidacao)) {
      throw new ErroApi(422, 'ESPECIFICACAO_INVALIDA', 'Informe a data de liquidação', undefined, [
        { caminho: '/dataLiquidacao', codigo: 'OBRIGATORIO', mensagem: 'Preencha: data de liquidação.', origem: 'api' },
      ]);
    }
    const l = obterLinha(db, id);
    const validacao = validarEspecificacao(JSON.parse(l.especificacao));
    if (!validacao.valido) {
      throw new ErroApi(422, 'ESPECIFICACAO_INVALIDA', 'Corrija as pendências antes de liquidar', undefined, validacao.erros,
        { avisos: validacao.avisos });
    }
    registrarEvento(db, id, 'liquidacao.recusada_sem_motor', { versao: l.versao_atual });
    throw new ErroApi(503, 'MOTOR_INDISPONIVEL', 'O cálculo está pronto, mas o PJe-Calc ainda não está conectado',
      estadoDoMotor().mensagem, undefined, { versao: l.versao_atual, avisos: validacao.avisos });
  });

  app.post('/v1/importacoes', async () => {
    throw new ErroApi(501, 'NAO_IMPLEMENTADO', 'Importação de .PJC ainda não implementada',
      'Depende do leitor seguro de .PJC (Fase 2). Por enquanto, importe uma especificação JSON.');
  });
}
