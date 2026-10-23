# Lacunas da especificação (checagem com os gabaritos)

Checagem feita em 23/10/2026: os três [gabaritos](../../motor/adaptador/testes/gabaritos/README.md) foram escritos como
especificação JSON (`gabarito-1-rescisao.json`, `contratos/exemplos/calculo-horas-extras.json` e
`gabarito-3-insalubridade.json`) e comparados com o que foi preciso configurar no PJe-Calc 2.16.0 e com o XML dos `.PJC`
exportados.

**Resultado:** as três especificações são válidas para a API (teste automático em `api/testes/api.test.ts`), mas
**não bastam para reproduzir os valores**: faltam campos que alteram o resultado e alguns padrões divergem dos do PJe-Calc.

## Prioridade alta — alteram valores dos gabaritos

| # | Lacuna | Onde aparece | No PJe-Calc (`.PJC`) | Proposta |
|---|---|---|---|---|
| 1 | Destino do FGTS (pagar ao reclamante ou recolher em conta vinculada) | Gabaritos 1, 2 e 3 usam "pagar"; o padrão do PJe-Calc é "recolher" | `Fgts/destinoDoFgts` = `PAGAR` \| `RECOLHER` | `fgts.destino: "pagar" \| "recolher"` |
| 2 | Base da multa do FGTS | Gabarito 2: "sobre o devido" dá R$ 20.021,05; "sobre a diferença" dá R$ 992,12 | `Fgts/incidenciaDoFgts` (5 opções) | `fgts.baseDaMulta: "devido" \| "diferenca" \| "saldo_saque" \| "devido_mais_saldo" \| "devido_menos_saldo"` |
| 3 | Padrão de prescrição quinquenal | Schema: `true`; PJe-Calc: desmarcada | `Calculo/prescricaoQuinquenal` | Adaptador sempre envia o valor explícito; corrigir o texto de `?resolvida=true` ou o padrão |
| 4 | Padrão de "zerar valores negativos" | Schema: `true`; PJe-Calc: `false` (cálculo e verbas) | `Calculo/zeraValorNegativo`, `Verba/zeraValorNegativo` | Alinhar o padrão do schema a `false` |
| 5 | Histórico automático "ÚLTIMA REMUNERAÇÃO" | Gabaritos 1 e 3 | Criado a partir de `valorUltimaRemuneracao`, sem FGTS; nome e valores bloqueados | Definir regra: o adaptador usa o histórico automático quando a especificação não traz histórico, e cria históricos próprios para faixas salariais |
| 6 | Linha automática de juros "Sem juros a partir do ajuizamento" | Gabaritos 1 e 3 | Inserida em `listaDeCombinacaoDeJuros` ao criar o cálculo | O adaptador apaga as combinações padrão e grava só as da especificação |

## Prioridade média — hoje cobertas pelos padrões do PJe-Calc

| # | Lacuna | No PJe-Calc | Proposta |
|---|---|---|---|
| 7 | Excluir o aviso prévio da base da multa do FGTS | `Fgts/excluirAvisoDaMulta` (padrão `true`) | `fgts.excluirAvisoDaBaseDaMulta` |
| 8 | Significado de `fgts.deduzirDepositados` | Não há campo equivalente direto; a dedução vem de `recolhidoFGTS` no histórico (`deduzirDoFGTS` é outra coisa) | Remover ou redefinir como "usar `fgtsRecolhido` do histórico" |
| 9 | Situação padrão das férias | O PJe-Calc gera os períodos aquisitivos: concessivo vencido = gozadas; demais = indenizadas | Documentar "omitido = padrão do PJe-Calc" em `ferias` |
| 10 | Comportamento dos reflexos | `Reflexo/comportamentoDoReflexo` (`MEDIA_PELA_QUANTIDADE`…), `periodoMediaReflexo` (`ANO_CIVIL`…), `tratamentoDaFracaoDeMesDoReflexo` | Trocar `reflexos[].comportamento` (texto livre) por enums |
| 11 | Credor dos honorários | O PJe-Calc exige o nome do credor | Tornar `honorarios[].credor` obrigatório ou definir padrão |
| 12 | Juros por fase | O PJe-Calc tem linhas separadas para índice e juros, e `aplicarJurosFasePreJudicial` | Definir o que significa omitir `juros` numa linha de `combinacao` |
| 13 | Custas | Padrão: 2% de conhecimento pelo reclamado (R$ 572,10 e R$ 1.318,74 nos gabaritos) | Detalhar `custas` (hoje objeto livre) com o padrão explícito |
| 14 | Contribuição social (INSS) | Valores dos gabaritos dependem dos padrões (atividade econômica, cota do empregador) | Detalhar `contribuicaoSocial` na Fase 2 |

## Para o gerador de `.PJC` (Fase 2)

- O `.PJC` exportado guarda resultados calculados (índices acumulados, taxas de juros, `hashCodeLiquidacao`,
  `hashCalculoCorreto`). Falta testar se a importação aceita um `.PJC` sem esses campos ou com o hash divergente.
- Datas em milissegundos desde 1970, à meia-noite de Brasília (03:00 UTC); texto em ISO-8859-1 com entidades numéricas.
- Objetos referenciados por `internalRef` (ex.: verba principal e reflexos, histórico e ocorrências).

## Próximos passos sugeridos

1. Incluir no schema os itens 1, 2, 7 e 8 (FGTS) e alinhar os padrões dos itens 3 e 4.
2. Fixar no adaptador as regras dos itens 5 e 6.
3. Atualizar as especificações dos gabaritos para usar os novos campos.
