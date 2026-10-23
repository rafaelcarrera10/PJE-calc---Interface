# API

Serviço HTTP/JSON que recebe a descrição de um cálculo trabalhista (a **especificação**), verifica se está completa e
coerente, solicita a liquidação ao PJe-Calc e devolve o resultado: resumo em JSON, relatório em PDF e arquivo `.PJC`.

A API é executada localmente, em `http://127.0.0.1:8080/v1`, no mesmo processo que serve a interface
([ADR-0006](../adr/0006-uso-pessoal-local-windows.md)). Por ser uma API HTTP documentada, também pode ser utilizada por
outros programas locais.

| Documento | Conteúdo |
|---|---|
| [recursos.md](recursos.md) | Rotas da versão 1 |
| [especificacao-de-calculo.md](especificacao-de-calculo.md) | Estrutura da especificação e correspondência com as telas do PJe-Calc |
| [jobs-e-erros.md](jobs-e-erros.md) | Tarefas assíncronas, status, padrão de erros e idempotência |
| Contrato | [`contratos/openapi.yaml`](../../contratos/openapi.yaml) e [`contratos/schemas/`](../../contratos/schemas/) |

## Princípios

1. **Contrato como referência.** O OpenAPI em `contratos/` define a API; servidor, cliente e documentação são validados a partir dele.
2. **Modelo de domínio próprio.** O contrato não expõe classes Java nem identificadores de tela do PJe-Calc. Exemplo:
   `"contrato": {"admissao": "2019-03-01"}`, e não `DDTADMISSAO` em milissegundos.
3. **Datas ISO 8601 e decimais como texto** (`"1234.56"`), evitando perda de precisão. A conversão para `dd/MM/yyyy`,
   vírgula decimal e fuso GMT-3 é feita pelo adaptador.
4. **Operações longas assíncronas.** A validação estrutural é síncrona; liquidação, relatórios e importações são tarefas
   (`202 Accepted` + `/v1/jobs/{id}`).
5. **Rastreabilidade.** Cada alteração gera uma nova versão da especificação, e cada liquidação registra a versão
   utilizada, a versão do PJe-Calc e o *hash* das tabelas.
6. **Erros acionáveis.** Formato RFC 9457 com o caminho do campo (`/verbas/2/periodo/fim`).
7. **Versionamento por URL** (`/v1`), com mudanças incompatíveis apenas em uma nova versão.
8. **Segurança adequada ao uso local.** Atendimento apenas em `127.0.0.1`, token de sessão por execução, verificação de
   `Host` e `Origin` e limites de tamanho ([segurança](../08-seguranca-e-lgpd.md)).

## Fluxo típico

```text
1. GET   /v1/catalogos/verbas                     consulta das verbas disponíveis
2. POST  /v1/calculos                             criação do cálculo (versão 1)
3. POST  /v1/calculos/{id}/validacoes             validação
4. PATCH /v1/calculos/{id}  (If-Match: "v1")      correção; gera a versão 2
5. POST  /v1/calculos/{id}/liquidacoes            solicitação da liquidação (202 + jobId)
6. GET   /v1/jobs/{jobId}                         acompanhamento: em_fila → processando → concluido
7. GET   /v1/liquidacoes/{lid}                    resumo: bruto, líquido, FGTS, INSS, IR, honorários, custas
8. GET   /v1/liquidacoes/{lid}/artefatos/pdf      relatório
9. GET   /v1/liquidacoes/{lid}/artefatos/pjc      arquivo .PJC
```

As etapas 5 a 9 dependem da integração com o PJe-Calc.
