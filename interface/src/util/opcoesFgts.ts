// Opções de FGTS usadas na etapa de encargos e no resumo da revisão.

export const MULTA_FGTS = [
  { valor: '40', rotulo: '40% (dispensa sem justa causa)' },
  { valor: '20', rotulo: '20% (culpa recíproca ou acordo do art. 484-A)' },
  { valor: 'nao_ha', rotulo: 'Sem multa' },
];

export const DESTINO_FGTS = [
  { valor: 'recolher', rotulo: 'Recolher na conta vinculada' },
  { valor: 'pagar', rotulo: 'Pagar ao reclamante' },
];

export const BASE_MULTA_FGTS = [
  { valor: 'devido', rotulo: 'Sobre o FGTS devido' },
  { valor: 'diferenca', rotulo: 'Sobre a diferença (devido − depositado)' },
  { valor: 'saldo_saque', rotulo: 'Sobre o saldo e/ou saque' },
  { valor: 'devido_mais_saldo_saque', rotulo: 'Sobre o devido + saldo e/ou saque' },
  { valor: 'devido_menos_saldo_saque', rotulo: 'Sobre o devido − saldo e/ou saque' },
];
