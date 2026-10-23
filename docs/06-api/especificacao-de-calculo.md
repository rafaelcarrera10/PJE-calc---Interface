# Especificação de cálculo (o "formulário" em JSON)

É o documento central do sistema: tudo o que o usuário decidiu sobre o cálculo, numa estrutura legível.
Schema formal: [`contratos/schemas/especificacao-calculo.schema.json`](../../contratos/schemas/especificacao-calculo.schema.json).
Exemplo completo: [`contratos/exemplos/calculo-horas-extras.json`](../../contratos/exemplos/calculo-horas-extras.json).

## Estrutura de alto nível

```json
{
  "versaoEspecificacao": "1.0",
  "processo":   { "numero": "0000000-00.2025.5.04.0001", "regional": "TRT4", "vara": "1ª VT de Porto Alegre" },
  "partes":     { "reclamante": {...}, "reclamado": {...}, "advogados": [...] },
  "contrato":   { "admissao": "2019-03-01", "demissao": "2024-06-30", "ajuizamento": "2025-02-10",
                  "tipoRescisao": "sem_justa_causa", "avisoPrevio": {"tipo": "indenizado", "projetar": true} },
  "parametros": { "uf": "RS", "municipio": "Porto Alegre", "cargaHorariaMensal": "220",
                  "sabadoDiaUtil": false, "prescricao": {"quinquenal": true, "fgtsTrintenaria": false},
                  "periodoCalculo": {"inicio": "2020-02-10", "fim": "2024-06-30"}, "maiorRemuneracao": "3500.00" },
  "historicoSalarial": [ { "nome": "Salário base", "periodos": [ {"de": "2019-03", "ate": "2024-06", "valor": "3500.00"} ] } ],
  "faltas": [], "ferias": [],
  "cartaoDePonto": null,
  "verbas": [ { "catalogo": "HORAS EXTRAS 50%", "periodo": {...}, "quantidade": {...}, "reflexos": [...] } ],
  "fgts": {...}, "contribuicaoSocial": {...}, "impostoDeRenda": {...},
  "honorarios": [...], "multas": [...], "custas": {...},
  "correcaoJurosMulta": { "indice": "IPCAE", "aPartirDe": {...}, "juros": "TAXA_LEGAL" },
  "anotacoes": { "premissas": ["..."], "fontes": [{"campo": "/contrato/admissao", "documento": "CTPS fl. 12"}] }
}
```

## Mapeamento seção → tela do PJe-Calc

| Seção | Tela | Observação |
|---|---|---|
| `processo`, `partes`, `contrato`, `parametros` | Dados do Cálculo | `regional` define feriados e tabelas regionais |
| `historicoSalarial[]` | Histórico Salarial | Pode virar CSV ou ir dentro do `.PJC` |
| `faltas[]`, `ferias[]` | Faltas / Férias | |
| `cartaoDePonto` | Cartão de Ponto | `quantidades` (por competência) ou `jornadas` (dia a dia) |
| `verbas[]` | Verbas (Expresso ou manual) + Reflexos + Ocorrências | `catalogo` = nome na biblioteca do motor; `personalizada` = verba manual |
| `fgts` | FGTS | Alíquota, multa 40/20%, depósitos já feitos |
| `contribuicaoSocial` | Contribuição Social (INSS) | Salários devidos/pagos, atividade econômica, atualização |
| `impostoDeRenda` | Imposto de Renda | Dependentes, RRA, tributação em separado |
| `honorarios[]`, `multas[]`, `custas` | Honorários / Multas e Indenizações / Custas | |
| `correcaoJurosMulta` | Correção, Juros e Multa | Índice, combinação de índices por período, juros |
| `anotacoes` | — (não vai ao PJe-Calc) | Premissas, origem de cada dado, comentários; exibido na interface e na auditoria |

## Regras de validação (camadas)

| Camada | Onde roda | Exemplos | Resposta |
|---|---|---|---|
| **1. Estrutural** | API, síncrona | tipos, formatos, campos obrigatórios, enums | `422` com caminhos |
| **2. Consistência** | API, síncrona | demissão ≥ admissão; períodos de verba dentro do contrato; histórico cobre o período das verbas; dígito verificador do número CNJ; CPF/CNPJ | `422` ou `avisos[]` |
| **3. Motor** | Job no PJe-Calc | "Pendências do Cálculo" (regras Drools oficiais) | resultado do job com `erros[]`/`alertas[]` mapeados para caminhos da especificação |

## Convenções

- Datas `YYYY-MM-DD`; competências `YYYY-MM`; valores monetários e quantidades como **string decimal** com ponto.
- Campos opcionais omitidos recebem o **padrão do PJe-Calc**, com uma exceção deliberada: a prescrição quinquenal é
  aplicada por padrão (no PJe-Calc ela vem desmarcada; o adaptador sempre envia o valor explícito). A API devolve a especificação "resolvida" (com os padrões
  explícitos) em `GET /calculos/{id}?resolvida=true`, para o usuário ver exatamente o que será usado.
- Campos iniciados com `_` são anotações livres e ignoradas no cálculo (mesma convenção do *PJeCalcMCP*).
