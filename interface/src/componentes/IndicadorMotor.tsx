import { useEffect, useState } from 'react';
import { api } from '../api';
import type { EstadoMotor } from '../tipos';

const ROTULOS: Record<EstadoMotor['estado'], string> = {
  nao_conectado: 'PJe-Calc não conectado',
  parado: 'PJe-Calc parado',
  iniciando: 'PJe-Calc iniciando…',
  pronto: 'PJe-Calc pronto',
  ocupado: 'PJe-Calc calculando…',
  falhou: 'PJe-Calc com falha',
};

export function IndicadorMotor() {
  const [motor, setMotor] = useState<EstadoMotor | null>(null);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    let ativo = true;
    const ler = () => api.motor().then((m) => ativo && setMotor(m)).catch(() => ativo && setMotor(null));
    ler();
    const t = setInterval(ler, 15000);
    return () => { ativo = false; clearInterval(t); };
  }, []);
  if (!motor) return <span className="motor motor-falhou">API local fora do ar</span>;
  return (
    <div className="motor-caixa">
      <button type="button" className={`motor motor-${motor.estado}`} onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
        <span className="motor-luz" aria-hidden /> {ROTULOS[motor.estado]}
      </button>
      {aberto && <div className="motor-detalhe">{motor.mensagem}</div>}
    </div>
  );
}
