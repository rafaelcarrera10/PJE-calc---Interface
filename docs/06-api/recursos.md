# Recursos da API v1

Base: `http://127.0.0.1:8080/v1` (local) · Autenticação: token de sessão local (cookie `HttpOnly`) · JSON UTF-8.

> Recursos marcados com *(modo servidor)* ficam fora do uso pessoal ([ADR-0006](../adr/0006-uso-pessoal-local-windows.md)).

## Cálculos (especificações)

| Método | Caminho | Descrição |
|---|---|---|
| `POST` | `/calculos` | Cria um cálculo a partir de uma especificação (pode ser parcial = rascunho) |
| `GET` | `/calculos` | Lista de cálculos (filtros: processo, parte, status, período; paginação por cursor) |
| `GET` | `/calculos/{id}` | Especificação vigente + metadados (`ETag` = versão) |
| `PATCH` | `/calculos/{id}` | Altera (JSON Merge Patch); exige `If-Match`; cria nova versão |
| `DELETE` | `/calculos/{id}` | Exclusão lógica + agendamento de expurgo (LGPD) |
| `GET` | `/calculos/{id}/versoes` · `/versoes/{n}` | Histórico imutável |
| `GET` | `/calculos/{id}/versoes/{a}/diff/{b}` | Diferenças entre versões |
| `POST` | `/calculos/{id}/duplicar` | Novo cálculo a partir deste (cenários) |

## Validação, liquidação e resultados

| Método | Caminho | Descrição |
|---|---|---|
| `POST` | `/calculos/{id}/validacoes` | `modo=rapido` (síncrono, só regras da API) ou `modo=motor` (job: pendências reais do PJe-Calc) |
| `POST` | `/calculos/{id}/liquidacoes` | Enfileira liquidação `{dataLiquidacao, indicesAcumulados?, atualizarTabelas?}`; `Idempotency-Key` |
| `GET` | `/liquidacoes/{lid}` | Status e **resumo estruturado** (créditos, descontos, débitos por credor, totais) |
| `GET` | `/liquidacoes/{lid}/artefatos` | Lista PDF, HTML, `.PJC`, JSON com `sha256` |
| `GET` | `/liquidacoes/{lid}/artefatos/{tipo}` | Download (URL assinada de curta duração) |
| `GET` | `/liquidacoes/{lid}/relatorios/{tipo}` | `demonstrativo`, `parametros`, `consolidado` · `?formato=pdf\|html` |
| `POST` | `/liquidacoes/{a}/comparar/{b}` | Comparação de cenários (diferença por verba e por rubrica) |

## Importação e exportação

| Método | Caminho | Descrição |
|---|---|---|
| `POST` | `/importacoes` | Upload de `.PJC` (multipart) → job → vira um cálculo editável (especificação) |
| `POST` | `/importacoes/csv/{tipo}` | `historico-salarial`, `ferias`, `faltas`, `cartao-de-ponto` → linhas validadas para colar na especificação |

## Execução (fase posterior)

| Método | Caminho | Descrição |
|---|---|---|
| `POST` | `/liquidacoes/{lid}/atualizacoes` | Atualiza cálculo homologado com pagamentos, depósitos, alvarás até uma data |
| `POST` | `/calculos-externos` | Atualiza conta feita fora do PJe-Calc |

## Catálogos e tabelas (somente leitura)

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/catalogos/verbas` | Biblioteca do "Lançamento Expresso" (nome, incidências, reflexos padrão) do motor alvo |
| `GET` | `/catalogos/{enum}` | `indices-correcao`, `juros`, `regimes`, `tipos-de-base`… lidos do motor |
| `GET` | `/catalogos/municipios?uf=` · `/feriados?regional=&ano=` | Para os parâmetros do cálculo |
| `GET` | `/tabelas/versao` | Versão do PJe-Calc e *hash* das tabelas por regional disponível |
| `GET` | `/utilitarios/selic?inicio=&fim=` | Fator SELIC (serviço REST interno do motor) |

## Jobs, webhooks e administração

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/jobs/{jobId}` | Status: `em_fila`, `processando`, `concluido`, `falhou`, `cancelado` + progresso por etapa |
| `DELETE` | `/jobs/{jobId}` | Cancela, se ainda estiver na fila |
| `POST/GET/DELETE` | `/webhooks` *(modo servidor)* | Assinaturas (`liquidacao.concluida`, `liquidacao.falhou`, `importacao.concluida`) com assinatura HMAC |
| `POST` | `/tabelas/sincronizacoes` | Atualiza as tabelas do PJe-Calc dedicado (índices, feriados do TRT) |
| `POST` | `/backups` · `POST /backups/restaurar` | Pacote com todos os cálculos para levar a outro computador |
| `GET` | `/saude` · `/saude/motor` | Estado do app e do PJe-Calc dedicado (parado, iniciando, pronto, ocupado) |
| `POST` | `/motor/iniciar` · `/motor/parar` | Controle do PJe-Calc dedicado |
