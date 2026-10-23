// Gera um JSON Merge Patch (RFC 7386) com só o que mudou entre "antes" e "depois".
type J = unknown;
const ehObjeto = (v: J): v is Record<string, J> => !!v && typeof v === 'object' && !Array.isArray(v);

export function criarMergePatch(antes: J, depois: J): J | undefined {
  if (!ehObjeto(antes) || !ehObjeto(depois)) {
    return JSON.stringify(antes) === JSON.stringify(depois) ? undefined : depois;
  }
  const patch: Record<string, J> = {};
  for (const k of Object.keys(antes)) if (!(k in depois) || depois[k] === undefined) patch[k] = null;
  for (const [k, v] of Object.entries(depois)) {
    if (v === undefined) continue;
    const sub = criarMergePatch(antes[k], v);
    if (sub !== undefined) patch[k] = sub;
  }
  return Object.keys(patch).length ? patch : undefined;
}
