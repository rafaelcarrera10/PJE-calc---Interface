# Imagem Docker do PJe-Calc (arquivado)

Material mantido como referência para uma eventual execução em servidor. Não é utilizado no cenário atual, de execução
local no Windows ([ADR-0006](../../../docs/adr/0006-uso-pessoal-local-windows.md)). Não foi construído nem testado.

## Funcionamento previsto

1. Imagem base `eclipse-temurin:8-jre` (o PJe-Calc exige Java 8).
2. Download do instalador oficial do TRT8 (`PJECALC_URL`) com conferência do SHA-256 (`PJECALC_SHA256`). Os binários não
   são versionados ([aspectos legais](../../../docs/09-aspectos-legais.md)).
3. Extração da aplicação com `7z` e descarte da JRE para Windows.
4. Apenas configuração de ambiente: `server.xml` com HTTP em `127.0.0.1:9257` e sem AJP.
5. Execução com usuário sem privilégios e início direto do Tomcat (`org.apache.catalina.startup.Bootstrap`).
6. Verificação de saúde: `GET /pjecalc/pages/principal.jsf`.

## Construção

```bash
docker build \
  --build-arg PJECALC_URL="<URL do instalador 2.16.x no portal do TRT8>" \
  --build-arg PJECALC_SHA256="<sha256 conferido>" \
  -t pjecalc-motor:2.16 motor/runtime/futuro-docker
```

## Pendências

- Verificar se o início direto do Tomcat dispensa algum preparo feito pelo lançador oficial (caminho do banco, `persistence.xml`).
- Parada ordenada para fechamento correto do banco H2.
- Fontes para os relatórios PDF (JasperReports) em Linux (`fonts-dejavu`, `fonts-liberation`).
