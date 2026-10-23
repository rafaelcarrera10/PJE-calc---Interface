# Adaptador do PJe-Calc

Componente responsável por operar o PJe-Calc Cidadão a partir da especificação de cálculo.

**Status:** em projeto. A implementação é própria; o projeto PJeCalcMCP (licença AGPL-3.0) foi utilizado apenas como
referência de estudo.

## Responsabilidades

1. Processar tarefas da fila interna, uma por vez (`liquidacao`, `validacao_motor`, `importacao_pjc`, `atualizacao`).
2. Converter a especificação de cálculo no `.PJC` de entrada correspondente à versão do PJe-Calc.
3. Operar o PJe-Calc por HTTP (JSF/A4J), reproduzindo as requisições do navegador, em uma sessão nova por tarefa.
4. Converter resultados, pendências e relatórios em dados estruturados, com erros associados ao caminho do campo na especificação.
5. Remover o cálculo da instância ao final e registrar métricas por etapa.

## Estrutura prevista

```text
motor/adaptador/
├── src/
│   ├── worker.ts              Consumo da fila, uma tarefa por vez, tempo limite por etapa
│   ├── nucleo/
│   │   ├── sessao-jsf.ts      Cookies, ViewState, formulários, AJAX A4J, upload RichFaces
│   │   ├── html.ts            Leitura de campos, mensagens e tabelas (ISO-8859-1)
│   │   └── motor.ts           Estado, prontidão, versão e logs
│   ├── pjc/
│   │   ├── zip.ts, xml.ts     Leitura e gravação seguras (sem DTD, lista de elementos permitidos)
│   │   └── gerador.ts         Especificação → .PJC, com base no catálogo da instância
│   └── versoes/
│       └── 2.16/              Elementos específicos da versão: URLs, campos, enumerações, mapeamentos
│           ├── operacoes.ts
│           ├── mapa-campos.json
│           └── mapeamento.ts
└── testes/
    ├── gabaritos/             Cálculos de referência fictícios (.PJC + PDF) e valores esperados
    └── regressao.test.ts      Importação, liquidação e comparação ao centavo
```

## Interface interna

```ts
interface OperadorPjeCalc {
  versao(): Promise<{ pjecalc: string; hashTabelas: string; regional: string }>;
  catalogoDeVerbas(): Promise<VerbaCatalogo[]>;
  importar(pjc: Uint8Array): Promise<{ idCalculo: number }>;
  regerarOcorrencias(id: number, opcoes: { manterAlteracoes: boolean }): Promise<void>;
  regerarEncargo(id: number, encargo: 'fgts' | 'contribuicaoSocial'): Promise<void>;
  pendencias(id: number): Promise<{ erros: Pendencia[]; alertas: Pendencia[] }>;
  liquidar(id: number, data: string, indicesAcumulados?: string): Promise<void>;
  relatorio(id: number, tipo: 'demonstrativo' | 'parametros' | 'consolidado', formato: 'pdf' | 'html'): Promise<Uint8Array>;
  exportar(id: number): Promise<Uint8Array>;
  excluir(id: number): Promise<void>;
}
```

## Sequência de uma liquidação

1. Geração do `.PJC` de entrada
2. Importação e passos complementares (cartão de ponto, vínculos)
3. Regeração das ocorrências das verbas, do FGTS e da contribuição social
4. Consulta de pendências (interrompe em caso de erro)
5. Liquidação
6. Emissão do relatório (PDF e HTML)
7. Exportação do `.PJC` oficial e conferência dos totais
8. Exclusão do cálculo na instância

## Regras de operação

- Uma sessão HTTP por tarefa, com requisições sequenciais.
- Em caso de `LockTimeoutException`, aguardar e recarregar a mesma URL.
- Reler os valores gravados em campos com máscara.
- Recusar versões do PJe-Calc sem mapeamento em `versoes/`.
- Reiniciar a instância ao detectar `OutOfMemoryError` ou banco fechado no log.
- Não gravar diretamente no banco H2.
- Operações não cobertas por HTTP podem usar Playwright como alternativa.
