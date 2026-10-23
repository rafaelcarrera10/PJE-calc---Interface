# ADR-0003 — `.PJC` como formato de troca

**Status:** Aceita · **Data:** 2026-10-22

## Contexto
Preencher 30+ telas por HTTP ou navegador é lento e frágil. O PJe-Calc importa `.PJC` (XML das entidades) numa única operação.
Um `.PJC` editado fora do motor depois de liquidado perde a validade (*hash*).

## Decisão
1. O adaptador **gera um `.PJC` de entrada** a partir da especificação (com o catálogo do motor alvo) e o **importa**.
2. Passos que a importação não cobre (ex.: apuração de cartão de ponto por jornada, vínculos de colunas) são feitos por
   ações de tela depois de importar.
3. O **entregável** ao usuário é sempre o `.PJC` **exportado pelo motor depois de liquidar**, nunca o gerado por nós.
4. `.PJC` vindo de usuários é entrada não confiável: *parser* próprio com lista branca antes de chegar ao motor.

## Consequências
- ✅ Rápido e determinístico; poucas interações com telas.
- ❌ Precisamos acompanhar o esquema XML a cada versão (testes de ida e volta: importar → exportar → comparar).
