# Motor

Integração com o PJe-Calc Cidadão.

```text
motor/
├── runtime/          Execução da instância dedicada do PJe-Calc (cópia, porta, início e parada sem janela)
│   └── futuro-docker/   Imagem Docker para execução em servidor (arquivado)
└── adaptador/        Operação do PJe-Calc por HTTP: importar, regerar, validar, liquidar, imprimir e exportar
```

- **runtime** não contém regras de negócio; apenas configura e controla a instância do PJe-Calc oficial.
- **adaptador** é o único componente que conhece telas, identificadores, formato `.PJC` e enumerações do PJe-Calc
  (camada anticorrupção, [ADR-0005](../docs/adr/0005-modelo-de-dominio-proprio.md)).

Referências: [funcionamento interno do PJe-Calc](../docs/02-pjecalc-por-dentro/README.md),
[estratégias de integração](../docs/04-estrategias-de-integracao.md), [ADR-0006](../docs/adr/0006-uso-pessoal-local-windows.md).
