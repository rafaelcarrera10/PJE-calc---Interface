# Contratos

Definições compartilhadas entre a interface, a API e o adaptador do PJe-Calc.

| Arquivo | Descrição |
|---|---|
| `openapi.yaml` | Contrato HTTP da API v1 (OpenAPI 3.1) |
| `schemas/especificacao-calculo.schema.json` | JSON Schema (draft 2020-12) da especificação de cálculo |
| `exemplos/` | Especificações fictícias para testes e documentação |

## Regras

- Alterações no contrato atualizam `info.version` no `openapi.yaml`.
- Mudanças incompatíveis exigem uma nova versão da API (`/v2`).
- Nomes internos do PJe-Calc (classes Java, identificadores de tela, colunas do banco H2) não fazem parte do contrato.
- Os exemplos não podem conter dados reais.

## Validação

```bash
npx @redocly/cli lint contratos/openapi.yaml
npx ajv-cli validate --spec=draft2020 -c ajv-formats \
  -s contratos/schemas/especificacao-calculo.schema.json -d "contratos/exemplos/*.json"
```
