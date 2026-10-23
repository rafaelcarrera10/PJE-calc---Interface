# Serviços REST internos do PJe-Calc

Base: `http://127.0.0.1:9257/pjecalc/servico/rest` (RESTEasy dentro do Seam, servlet `/servico/*`).
Lidos do bytecode de `web.servicos.rest.server.*` e confirmados pelo cliente do *PJeCalcMCP*.

**Autenticação:** cabeçalho `Authentication: <token>`. O token é configurado na JVM
(`-Dseguranca.pjecalc.tokenServicos`).

| Método | Caminho | Função |
|---|---|---|
| GET | `/atualizacao/selic?dataInicial=dd/MM/yyyy&dataFinal=dd/MM/yyyy` | Fator SELIC acumulado no período |
| POST | `/atualizacao/precatorios` | Atualiza um precatório (`AtualizacaoPrecatorioDTO`) |
| POST | `/atualizacao/sip/precatorios` | Lote SIP (`AtualizacaoPrecatorioSIPDTO[]`) |
| POST | `/atualizacao/sip/precatorios/indices` | Lote SIP de índices |
| GET | `/sincronizacao/nacionais/ultimaVersao` | Versão mais recente das tabelas nacionais |
| GET | `/sincronizacao/nacionais/versao/{hash}` | Dados de uma versão |
| GET | `/sincronizacao/nacionais/{hash}?versao=X` | Pacote de tabelas (base64 de gzip); 404 = já atualizado |
| GET | `/sincronizacao/nacionaiseregionais/regional/{TRT}/hash/{hash}` | Tabelas nacionais + regionais de um TRT |
| GET | `/sincronizacao/nacionaiseregionaisproxy/regional/{TRT}/hash/{hash}` | Idem, via TRT raiz |

**O que NÃO existe:** endpoints para criar, editar, validar, liquidar, imprimir, exportar ou importar
cálculos. Isso só existe na camada de telas (JSF). Esta é a razão de existir do nosso **adaptador**.

**Uso na nossa solução:**

- `/atualizacao/selic` → utilitário `GET /v1/utilitarios/selic` (sem precisar abrir cálculo).
- `/sincronizacao/*` → botão **"Atualizar tabelas"** do PJe-Calc dedicado, com registro do *hash* resultante.
- Precatórios → fase de execução (roadmap).
