# Execução em servidor (arquivado)

Material mantido como referência para uma eventual execução em servidor, com vários usuários. Não é utilizado no cenário
atual, de execução local no Windows ([ADR-0006](../../docs/adr/0006-uso-pessoal-local-windows.md)). Não foi testado.

## Uso previsto

```bash
cp infra/futuro-servidor/.env.exemplo infra/futuro-servidor/.env
docker compose -f infra/futuro-servidor/docker-compose.yml up --build
```

| Serviço | Porta | Observação |
|---|---|---|
| interface | 3000 | |
| api | 8080 | `/v1`, `/v1/saude` |
| motor | — | Não publicado; acessível apenas pelo adaptador |
| postgres, redis, minio | internas | |

## Observações

- O adaptador compartilha a rede do motor (`network_mode: service:motor`) para acessar `127.0.0.1:9257`. A rede `isolada`
  não tem acesso à internet; o Redis participa dela para a fila de tarefas.
- Em Kubernetes, motor e adaptador ficariam no mesmo pod, com `NetworkPolicy` liberando apenas o Redis e o armazenamento de
  arquivos, e escalonamento pela fila (KEDA).
