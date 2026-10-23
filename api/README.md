# API

API HTTP local do PJE Calc Fácil. Atende em `http://127.0.0.1:8080/v1` e, na versão compilada, também serve a interface.

Contrato: [`contratos/openapi.yaml`](../contratos/openapi.yaml) · Documentação: [`docs/06-api`](../docs/06-api/README.md)

## Status

Versão 0.1. Cadastro, versionamento, validação e catálogos estão implementados. A liquidação depende do adaptador do
PJe-Calc, ainda em desenvolvimento; até lá, `POST /v1/calculos/{id}/liquidacoes` valida o cálculo e responde
`503 MOTOR_INDISPONIVEL`.

## Execução

Os comandos são executados na raiz do repositório:

```bash
npm install
npm run dev     # API e interface em modo de desenvolvimento
npm test        # testes da API
npm start       # versão compilada (requer npm run build)
```

Ao iniciar, a API exibe no terminal o endereço, a pasta de dados e o token de sessão para uso por scripts.

## Configuração

| Variável | Padrão | Descrição |
|---|---|---|
| `PORTA` | `8080` | Porta local |
| `PJECALC_FACIL_DADOS` | pasta de dados do sistema (ver `src/config.ts`) | Local do banco `pjecalc-facil.db` |

## Recursos

| Funcionalidade | Rotas |
|---|---|
| Cálculos | `POST/GET /v1/calculos`, `GET/PATCH/DELETE /v1/calculos/{id}`, `POST /v1/calculos/{id}/duplicar` |
| Versões | `GET /v1/calculos/{id}/versoes`, `GET /v1/calculos/{id}/versoes/{n}` |
| Validação | `POST /v1/calculos/{id}/validacoes` |
| Catálogos | `GET /v1/catalogos/verbas`, `GET /v1/catalogos/{indices-correcao, juros, tipos-rescisao, regionais, ufs}` |
| Motor | `GET /v1/saude/motor`, `POST /v1/calculos/{id}/liquidacoes` |
| Sessão e saúde | `GET /v1/sessao`, `GET /v1/saude` |

Comportamentos relevantes:

- Cada alteração gera uma versão imutável. `PATCH` usa JSON Merge Patch (RFC 7386) e exige `If-Match`; versões
  divergentes retornam `409`.
- `GET /v1/calculos/{id}?resolvida=true` retorna a especificação com os valores padrão explícitos.
- Erros seguem a RFC 9457 (`application/problem+json`) e indicam o caminho do campo (JSON Pointer).
- O catálogo de verbas é provisório: contém as 54 verbas da biblioteca do PJe-Calc 2.14 com seus reflexos e será
  substituído pelo catálogo lido da instalação do PJe-Calc.

## Validação

A validação ocorre em duas camadas: estrutura (JSON Schema) e consistência. As regras de consistência incluem:

- dígito verificador do número CNJ e correspondência com o TRT selecionado;
- ordem das datas de admissão, demissão e ajuizamento; prescrição bienal e quinquenal;
- períodos invertidos e faixas salariais sobrepostas;
- períodos de verbas fora do contrato;
- histórico salarial inexistente ou incompleto no período da verba;
- reflexos fora do padrão da verba;
- percentual de honorários;
- ordem cronológica dos índices de correção.

## Segurança

- Atende apenas em `127.0.0.1`.
- Requisições com cabeçalho `Host` diferente de `127.0.0.1`/`localhost` são recusadas (proteção contra DNS rebinding).
- Requisições de escrita com `Origin` diferente da interface são recusadas.
- Acesso condicionado a um token aleatório gerado a cada execução, entregue à interface por cookie `HttpOnly` e
  `SameSite=Strict` ou informado por scripts no cabeçalho `Authorization: Bearer`.

## Estrutura

```text
api/
├── src/
│   ├── index.ts            Inicialização do servidor
│   ├── servidor.ts         Montagem da aplicação Fastify (também usada nos testes)
│   ├── config.ts           Porta e pasta de dados
│   ├── db.ts               SQLite (node:sqlite) e migrações
│   ├── seguranca.ts        Host, Origin e token de sessão
│   ├── problemas.ts        Respostas de erro (RFC 9457)
│   ├── modulos/
│   │   ├── calculos.ts     Cadastro, versionamento e validação
│   │   ├── validacao.ts    Regras de schema e de consistência
│   │   ├── catalogos.ts    Verbas e listas de apoio
│   │   └── motor.ts        Estado do motor e liquidação
│   └── dados/
│       └── catalogo-verbas.json
└── testes/
    └── api.test.ts
```

## Próximas etapas

- Integração com o adaptador do PJe-Calc; liquidação como tarefa assíncrona com acompanhamento de progresso.
- Catálogos lidos da instalação do PJe-Calc.
- Importação de arquivos `.PJC`, backup e restauração.
