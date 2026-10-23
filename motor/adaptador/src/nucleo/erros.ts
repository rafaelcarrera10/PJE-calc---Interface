// Erros do adaptador. O código é estável e pode ser repassado pela API (ex.: MOTOR_INDISPONIVEL).

export type CodigoErroAdaptador =
  | 'INSTALACAO_INVALIDA'
  | 'MOTOR_INDISPONIVEL'
  | 'MOTOR_FALHOU'
  | 'TEMPO_ESGOTADO'
  | 'RESPOSTA_INESPERADA'
  | 'OPERACAO_RECUSADA';

export class ErroAdaptador extends Error {
  constructor(
    public readonly codigo: CodigoErroAdaptador,
    mensagem: string,
    public readonly detalhes?: Record<string, unknown>,
  ) {
    super(mensagem);
    this.name = 'ErroAdaptador';
  }
}
