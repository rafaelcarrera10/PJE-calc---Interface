# O arquivo `.PJC`

É o formato de **exportação/importação** do PJe-Calc e o arquivo que se junta ao processo. Entender esse
formato é o que permite à API **entregar e receber cálculos** sem digitar tela por tela.

## Estrutura

```text
CALCULO_<n>_DATA_<ddMMyyyy>_HORA_<HHmmss>.PJC   ← arquivo ZIP (deflate)
└── <mesmo nome>.PJC                             ← UMA entrada: XML ISO-8859-1
    <?xml version="1.0" encoding="ISO-8859-1"?>
    <Calculo> ... </Calculo>
```

Regras de serialização, confirmadas pelo leitor/gravador do *PJeCalcMCP* e pelo `Importador` (`XMLImpScanProcessor`):

| Elemento | Representação |
|---|---|
| Objeto | Elemento com o **nome simples da classe Java** (`Calculo`, `Calculada`, `Reflexo`, `OcorrenciaDeVerba`...) |
| Campo | Um filho por **campo JPA** (nome do atributo Java), inclusive os herdados |
| Nulo | Texto `null` |
| Data | **milissegundos desde 1970**, interpretados no fuso **GMT-3** |
| Booleano / enum / número | `true`/`false` · nome da constante · texto numérico (`BigDecimal`) |
| Objeto aninhado | `<campo><Classe>...</Classe></campo>` |
| Coleção | `<campo><Set>…</Set></campo>` ou `<List>` |
| Referência interna | Objeto já escrito volta como `<Classe><internalRef>ID</internalRef></Classe>` |
| Referência a tabela | Entidades fora do cálculo (`Municipio`, `AssuntoCnj`, `Feriado`, verba da biblioteca...) vão como `<Classe><externalRef>CHAVE</externalRef></Classe>` e são resolvidas **no banco de quem importa** |
| Texto | `& < > " '` escapados; caracteres > 0x7F como `&#NNN;`; fora do Latin-1 vira `?` |

Os ids das entidades do cálculo são **descartados na importação**: o banco gera novos.

## O *hash* da liquidação (validade do arquivo)

A tabela `TBCALCULO` guarda `SCDHASHLIQUIDACAO`, `SFLHASHCALCULOCORRETO`, `SFLHASHATUALIZACAOCORRETO` e
`SDSVERSAOSISTEMALIQUIDACAO`. A entidade `Calculo` tem `calcularHashCodeDaLiquidacao()` e
`isAlteradoParaLiquidacao()`. Na prática:

- Quando o PJe-Calc **liquida**, ele grava um *hash* do estado do cálculo e a versão do sistema.
- Se o arquivo é alterado fora do PJe-Calc depois da liquidação, o *hash* deixa de bater. O cálculo aparece como
  alterado ou inválido, e o PJe-Calc **Institucional** recusa a importação (relato do projeto *pjecalc-agente*).

**Consequência para a arquitetura** ([ADR-0003](../adr/0003-pjc-como-formato-de-troca.md)):

1. Um `.PJC` **gerado pela nossa API** serve só como **formato de entrada** para o motor (em vez de digitar tela por tela).
2. O `.PJC` **entregue ao usuário** é sempre o que o PJe-Calc **exportou depois de liquidar** (o "-PRONTO.PJC" do *PJeCalcMCP*).
3. Nunca se edita um `.PJC` liquidado. Para mudar, importa-se, altera-se pelo motor, liquida-se e exporta-se de novo.

## Compatibilidade entre versões

- O XML espelha as entidades JPA. **Campos novos surgem a cada versão.** Um `.PJC` de versão mais nova pode
  não abrir numa versão antiga.
- `externalRef` depende das tabelas do banco de destino (ex.: id da verba na biblioteca). Gerar `.PJC` exige
  conhecer o banco do motor que vai importá-lo. Por isso o gerador da API lê o catálogo do **motor alvo**.

## Riscos de segurança na importação

O `Importador` instancia classes por **reflexão a partir do nome do elemento XML**. Um `.PJC` enviado por
usuário é **entrada não confiável**. Antes de repassá-lo ao motor, a API:

- valida o ZIP (uma entrada, tamanho máximo, taxa de compressão para barrar *zip bomb*, nome sem `../`);
- faz o *parse* com um leitor **próprio e seguro** (sem DTD/entidades externas — XXE), com **lista branca** de
  elementos/classes conhecidas da versão;
- só então envia ao motor, que roda isolado e sem rede (ver [08](../08-seguranca-e-lgpd.md)).
