# ADR-0001 — PJe-Calc oficial como motor isolado

**Status:** Aceita · **Data:** 2026-10-22 · **Nota:** no uso pessoal ([ADR-0006](0006-uso-pessoal-local-windows.md)), o "isolamento" é uma **cópia dedicada do PJe-Calc no próprio Windows**, só em `127.0.0.1`, em vez de contêineres.

## Contexto
Precisamos de cálculos com a mesma validade do PJe-Calc. As alternativas eram: reescrever o motor, embutir as classes Java,
escrever no banco ou operar o programa oficial ([04](../04-estrategias-de-integracao.md)). O PJe-Calc não tem API de cálculo, e
sua pilha é antiga e vulnerável ([08](../08-seguranca-e-lgpd.md)).

## Decisão
Rodar o **PJe-Calc Cidadão oficial, sem alterações de código**, em contêineres isolados (sem rede, porta só local), operados
exclusivamente por um **adaptador**. O cálculo, a validação e a exportação são sempre feitos pelo programa oficial.

## Consequências
- ✅ Fidelidade total ao resultado oficial e ao *hash* da liquidação.
- ✅ Atualizar de versão = trocar a imagem + ajustar o adaptador.
- ❌ Custo de infraestrutura (JVM pesada por instância) e latência de partida.
- ❌ Dependência de telas/HTTP interno, que podem mudar entre versões. Mitigado pela ADR-0005 e pelos gabaritos.
- ⚠️ Depende da confirmação legal de uso ([09](../09-aspectos-legais.md)).
