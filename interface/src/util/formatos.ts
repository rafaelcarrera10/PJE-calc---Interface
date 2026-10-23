// Conversões entre o que o usuário vê (pt-BR) e o que a API recebe (ISO / decimal com ponto).

/** "3500.5" → "3.500,50" */
export function formatarDinheiro(decimal: string | undefined | null): string {
  if (decimal === undefined || decimal === null || decimal === '') return '';
  const n = Number(decimal);
  if (Number.isNaN(n)) return decimal;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "3.500,50" | "3500,5" | "3500.50" → "3500.50"; vazio → undefined; inválido → null */
export function lerDinheiro(texto: string): string | undefined | null {
  const t = texto.trim().replace(/^R\$\s*/i, '');
  if (!t) return undefined;
  let normal = t;
  if (t.includes(',')) normal = t.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return null;
  return Number(normal).toFixed(2);
}

/** Decimal livre (quantidades, divisores, percentuais): aceita vírgula. */
export function lerDecimal(texto: string): string | undefined | null {
  const t = texto.trim();
  if (!t) return undefined;
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return null;
  return String(Number(normal));
}

export const formatarDecimal = (d?: string | null) => (d ? d.replace('.', ',') : '');

/** "2024-06-30" → "30/06/2024"; "2024-06" → "06/2024" */
export function formatarData(iso?: string | null): string {
  if (!iso) return '—';
  const p = iso.split('-');
  return p.reverse().join('/');
}

export function somarAnos(iso: string, anos: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  return `${a + anos}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const maiorData = (a?: string, b?: string) => (!a ? b : !b ? a : a > b ? a : b);

export function formatarQuando(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
