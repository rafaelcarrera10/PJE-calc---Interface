# ADR-0005 — Modelo de domínio próprio e camada anticorrupção

**Status:** Aceita · **Data:** 2026-10-22

## Contexto
Telas, IDs, enums e esquema do `.PJC` mudam a cada versão do PJe-Calc. A interface e os integradores precisam de estabilidade.

## Decisão
A API e a interface usam apenas a **especificação de cálculo** (`contratos/`), em português claro, com datas ISO e decimais
como string. Todo conhecimento do PJe-Calc fica no **adaptador**, organizado por versão (`motor/adaptador/versoes/2.16/`).
Enums variáveis (índices, juros, verbas) são servidos pelos **catálogos** lidos do motor.

## Consequências
- ✅ Troca de versão do PJe-Calc sem impacto na interface.
- ❌ Manter o mapeamento especificação ↔ PJe-Calc (documentado em [especificacao-de-calculo.md](../06-api/especificacao-de-calculo.md)).
