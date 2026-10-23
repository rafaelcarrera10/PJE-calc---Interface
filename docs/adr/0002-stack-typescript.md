# ADR-0002 — Stack TypeScript

**Status:** Aceita, com infraestrutura revista pela [ADR-0006](0006-uso-pessoal-local-windows.md): SQLite + arquivos locais no lugar de PostgreSQL/Redis/S3; interface em React + Vite (SPA servida pela própria API) no lugar de Next.js · **Data:** 2026-10-22

## Contexto
O usuário pediu recomendação. A API orquestra jobs e HTTP; o adaptador lida com HTML/JSF, ZIP e XML; a interface será web.
A implementação de referência mais madura da comunidade (PJeCalcMCP) é em JavaScript; Playwright (reserva) tem a melhor
API em TS.

## Decisão
Monorepo **TypeScript** (Node 22 LTS, pnpm): `api/` (Fastify), `motor/adaptador` (worker BullMQ), `interface/` (Next.js),
tipos gerados do `contratos/openapi.yaml`. PostgreSQL, Redis, S3/MinIO.

## Alternativas consideradas
- **Python (FastAPI + Celery):** ótimo para IA/OCR; perderíamos o compartilhamento de tipos com a interface. Reservado para
  um futuro serviço de extração.
- **Java (Spring):** mesma linguagem do PJe-Calc, mas não usaremos as classes internas (ADR-0001), então a vantagem some;
  ficaríamos presos ao Java 8 se quiséssemos compartilhar a JVM.

## Consequências
- ✅ Um idioma só para a equipe; validação (Zod) compartilhada entre interface e API.
- ❌ Aritmética decimal exige biblioteca (decimal.js), nunca `number` para dinheiro.
