# Gabaritos (cálculos de referência)

Cálculos **fictícios** montados e liquidados diretamente no PJe-Calc Cidadão oficial, usados como referência para o
adaptador: ao montar o mesmo cálculo a partir da especificação JSON, o resultado deve bater **ao centavo**.

| Item | Valor |
|---|---|
| PJe-Calc | 2.16.0 (instância dedicada, porta 9357) |
| Tabelas | Atualização online do TRT4 em 23/10/2026 |
| Data de liquidação | 31/10/2026 |
| Índices acumulados | A partir do mês subsequente ao vencimento (padrão) |

Arquivos de cada gabarito: `.PJC` (exportado pelo PJe-Calc após liquidar) e `.pdf` (relatório completo). O mesmo
relatório em `.html`, útil para leitura automática dos valores, é gerado localmente e não é versionado (0,5 a 3 MB por
arquivo). Os valores esperados estão em
[`valores-esperados.json`](valores-esperados.json).

> Os resultados dependem das tabelas de índices vigentes na data da atualização. Ao atualizar as tabelas do PJe-Calc,
> os valores mudam e os gabaritos precisam ser regerados.

## Gabarito 1 — Rescisão sem justa causa

Processo 0000101-27.2025.5.04.0001 · TRT4 · Porto Alegre/RS

- Admissão 01/03/2022, demissão 31/01/2025, ajuizamento 10/03/2025; salário fixo R$ 2.500,00 (histórico automático
  "ÚLTIMA REMUNERAÇÃO", sem incidência de FGTS).
- Aviso prévio calculado (Lei 12.506/2011, 36 dias) e projetado.
- Verbas (Lançamento Expresso): saldo de salário, aviso prévio, 13º salário (período 01/01/2025–31/01/2025),
  férias + 1/3 (período 01/03/2024–31/01/2025), multa do art. 477.
- Férias: o PJe-Calc considerou, por padrão, 2022/2023 gozadas e 2023/2024 indenizadas; o valor inclui as férias
  vencidas 2023/2024 e as proporcionais 2024/2025 com a projeção do aviso.
- FGTS: pagar ao reclamante, 8%, multa de 40% sobre o devido.
- Correção: IPCA-E + TRD (juros simples) até 29/08/2024; IPCA + taxa legal a partir de 30/08/2024 (Lei 14.905/2024).
  A linha padrão "Sem juros a partir do ajuizamento" foi removida.

**Bruto R$ 19.558,47 · Líquido ao reclamante R$ 19.272,42**

## Gabarito 2 — Horas extras com reflexos

Processo 0000123-85.2025.5.04.0001 · TRT4 · Porto Alegre/RS. Corresponde ao exemplo
[`contratos/exemplos/calculo-horas-extras.json`](../../../../contratos/exemplos/calculo-horas-extras.json).

- Admissão 01/03/2019, demissão 30/06/2024, ajuizamento 10/02/2025; prescrição quinquenal (verba a partir de
  10/02/2020); aviso indenizado projetado; última remuneração R$ 3.500,00.
- Histórico "SALÁRIO BASE": R$ 3.000,00 (03/2019–12/2021) e R$ 3.500,00 (01/2022–06/2024), com incidência e
  recolhimento de FGTS e contribuição social em todos os meses.
- Horas extras 50%: base "SALÁRIO BASE", divisor por carga horária (220), multiplicador 1,5, 20 horas por mês.
  Reflexos: RSR e feriados, 13º salário, férias + 1/3, aviso prévio.
- FGTS: pagar, 8%, multa de 40% **sobre a diferença** (a multa sobre os depósitos regulares é considerada paga na
  rescisão). Com a incidência "sobre o devido", a multa sairia R$ 20.021,05.
- IR: apurar, sem dependentes. Honorários advocatícios de 15% sobre o bruto, devidos pelo reclamado.
- Correção (ADC 58/59, como no exemplo): IPCA-E até 09/02/2025 e SELIC a partir de 10/02/2025; sem juros.

**Bruto R$ 47.858,98 · Líquido ao reclamante R$ 46.390,52 · Honorários R$ 7.178,85**

## Gabarito 3 — Adicional de insalubridade

Processo 0000303-98.2025.5.04.0002 · TRT4 · Porto Alegre/RS

- Admissão 01/02/2021, demissão 31/12/2024, ajuizamento 15/04/2025; salário fixo R$ 1.800,00; aviso indenizado
  projetado.
- Adicional de insalubridade 20% sobre o salário mínimo, mensal, durante todo o contrato. Reflexos: 13º salário,
  férias + 1/3, aviso prévio.
- FGTS: pagar, 8%, multa de 40% sobre o devido.
- Honorários advocatícios de 10% sobre o bruto, devidos pelo reclamado.
- Correção: igual ao gabarito 1 (IPCA-E + TRD; IPCA + taxa legal a partir de 30/08/2024).

**Bruto R$ 21.668,93 · Líquido ao reclamante R$ 20.616,78 · Honorários R$ 2.166,89**

## Observações sobre a operação do PJe-Calc

Registradas ao montar os gabaritos pela interface web (JSF/RichFaces), úteis para o adaptador:

- **Requisições estritamente sequenciais.** Eventos AJAX simultâneos causam `IllegalArgumentException: row is
  unavailable` e "Erro Interno no Servidor"; a conversa precisa ser reiniciada.
- Campos com `onchange`/`onblur` (estado, município, datas, valores da grade do histórico) só gravam após o próprio
  evento AJAX; preencher o valor e salvar o formulário não basta.
- Confirmações usam a função `confirma()` da página (diálogo próprio), não `window.confirm`.
- O histórico "ÚLTIMA REMUNERAÇÃO" é gerado a partir dos dados do contrato; nome e valores não são editáveis. Faixas
  salariais exigem um histórico novo, preenchido com "Gerar Ocorrências" por faixa.
- Combinações de índice e juros só valem após o botão "Adicionar" de cada linha.
- Após alterar parâmetros de verba, regerar com **Sobrescrever**; "Manter alterações" mantém ocorrências antigas.
  O alerta "O parâmetro Quantidade foi alterado após a geração das ocorrências" continua aparecendo mesmo assim.
- Relatório e `.PJC` são entregues por um POST do formulário (`linkDownloadConsolidado` / exportar) disparado por
  script na resposta AJAX.
- Liquidação: cerca de 2,5 s por cálculo.
