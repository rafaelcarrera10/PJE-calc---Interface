# 09 — Aspectos legais e de propriedade intelectual

> Este documento organiza **questões a validar com advogado**. Não é parecer jurídico.

## 1. O PJe-Calc (programa oficial)

- Desenvolvido pelo **TRT da 8ª Região** para o **CSJT** e distribuído gratuitamente no portal do TRT8.
- **Não localizamos licença de software livre** que autorize redistribuição ou modificação. Tratar como software
  **proprietário de uso gratuito**.
- ✅ **Pendência resolvida (22/10/2026):** a ferramenta é de **uso pessoal** ([ADR-0006](adr/0006-uso-pessoal-local-windows.md)),
  instalada nos próprios computadores, cada um com o PJe-Calc Cidadão baixado do site oficial. É o uso para o qual o programa é
  distribuído, então **não é necessária consulta ao TRT8/CSJT**.
- Diretrizes que continuam valendo:
  1. **Não redistribuir** os binários do PJe-Calc (não versionar no Git, não embutir no nosso instalador). O instalador do app
     **localiza** o PJe-Calc que o usuário baixou e faz dele uma **cópia local dedicada** na mesma máquina.
  2. **Não modificar** classes, jars ou regras. Ajustes só de **ambiente** na cópia dedicada (porta, memória, sem AJP, sem janela).
  3. Não usar marcas oficiais (CSJT, TST, TRT8, logotipo do PJe) de forma que sugira vínculo.
  4. ⚠️ **Se um dia** a ferramenta for oferecida a terceiros (gratuita ou paga), a consulta formal ao TRT8/CSJT volta a ser necessária.
- Engenharia reversa: a análise foi feita **só por leitura** (interoperabilidade). Ainda assim, convém confirmar
  com assessoria o enquadramento na Lei 9.609/1998 (software).

## 2. Validade do cálculo

- O resultado tem a "autoridade" do PJe-Calc **porque é o próprio PJe-Calc que liquida e exporta**.
- O `.PJC` entregue é sempre o exportado pelo motor depois da liquidação. Alterá-lo depois invalida o *hash* (ver [formato-pjc](02-pjecalc-por-dentro/formato-pjc.md)).
- A responsabilidade técnica e jurídica pelo conteúdo (o que foi deferido, os parâmetros) é do **profissional que
  assina o cálculo**. Os termos de uso devem deixar isso claro.

## 3. Projetos da comunidade

| Projeto | Licença | Como usamos |
|---|---|---|
| `lucianumm/PJeCalcMCP` | **AGPL-3.0** | **Só como referência de estudo.** Copiar ou adaptar o código para um serviço em rede obrigaria a disponibilizar **todo** o código do serviço sob AGPL. Implementação própria (*clean room*), sem copiar trechos |
| `bragabarreto/pjecalc-agente`, `davipavanin/pjecalc-preenchedor`, `alexandre575/agentepjecalk`, `lucianum7/CalculadoraTrabalhista`, instaladores | MIT | Reuso permitido com aviso de copyright. Preferimos referência a cópia |
| `krymancer/pjecalc-cidadao-bin` | 0BSD | Livre |
| Repositórios **sem licença** | Todos os direitos reservados | Somente leitura |

Manter `docs/fontes.md` atualizado com a origem de cada ideia.

## 4. Atividade e responsabilidade

- A ferramenta é **apoio**: não substitui a conferência profissional de quem assina o cálculo.
- Se houver extração por IA no futuro: deixar claro que as sugestões precisam de revisão humana antes de calcular.
