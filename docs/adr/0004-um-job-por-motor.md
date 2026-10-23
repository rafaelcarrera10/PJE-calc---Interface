# ADR-0004 — Um job por motor

**Status:** Aceita em parte. Continua valendo "um job por vez, sessão nova por job"; o *pool*/fila externa foi substituído pela [ADR-0006](0006-uso-pessoal-local-windows.md) (uma instância local, fila interna) · **Data:** 2026-10-22

## Contexto
O PJe-Calc é monousuário: *presenters* `@Synchronized`, uma *view* JSF por sessão, conversas Seam e banco H2 com trava de arquivo.

## Decisão
Cada instância do motor processa **um job por vez**, com sessão HTTP nova a cada job e limpeza do cálculo ao final.
A escala é horizontal (*pool* + fila com rótulos de versão e regional), com reciclagem periódica das instâncias.

## Consequências
- ✅ Sem condições de corrida nem `LockTimeoutException` entre usuários; isolamento de dados entre inquilinos dentro do motor.
- ❌ Custo de memória proporcional ao paralelismo; partida lenta exige motores "quentes".
