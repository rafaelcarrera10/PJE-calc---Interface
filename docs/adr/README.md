# Registro de decisões de arquitetura (ADRs)

Cada registro descreve contexto, decisão e consequências. Registros não são removidos; quando uma decisão muda, um novo
ADR é criado e o anterior passa a indicar a substituição.

| # | Decisão | Status |
|---|---|---|
| [0001](0001-pjecalc-como-motor-isolado.md) | PJe-Calc oficial, sem modificações, como motor isolado | Aceita |
| [0002](0002-stack-typescript.md) | TypeScript na API, no adaptador e na interface | Aceita (infraestrutura revista pela 0006) |
| [0003](0003-pjc-como-formato-de-troca.md) | `.PJC` como formato de entrada; entrega apenas do arquivo exportado pelo motor | Aceita |
| [0004](0004-um-job-por-motor.md) | Uma tarefa por instância do motor | Parcialmente substituída pela 0006 |
| [0005](0005-modelo-de-dominio-proprio.md) | Modelo de domínio próprio e camada anticorrupção versionada | Aceita |
| [0006](0006-uso-pessoal-local-windows.md) | Uso pessoal: aplicação local no Windows, instância dedicada do PJe-Calc e instalador | Aceita |
