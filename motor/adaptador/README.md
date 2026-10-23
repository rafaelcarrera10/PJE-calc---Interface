# Adaptador do PJe-Calc

Componente responsável por operar o PJe-Calc Cidadão a partir da especificação de cálculo.

**Status:** primeira fatia funcional (Fase 1). Inicia e para a instância dedicada sem janela e liquida um `.PJC`
(importar → liquidar → relatório PDF/HTML → exportar `.PJC` → excluir) por HTTP. Os três
[gabaritos](testes/gabaritos/README.md) conferem ao centavo. Ainda não gera o `.PJC` a partir da especificação JSON
(Fase 2). Decisões em [ADR-0007](../../docs/adr/0007-partida-pelo-tomcat-e-operacao-por-http.md).

A implementação é própria; o projeto PJeCalcMCP (licença AGPL-3.0) foi utilizado apenas como referência de estudo.

## Uso

Na raiz do repositório:

```bash
npm run motor -- estado
npm run motor -- iniciar
npm run motor -- liquidar motor/adaptador/testes/gabaritos/gabarito-1-rescisao.PJC --data 2026-10-31 --saida saida
npm run motor -- parar
```

`liquidar` inicia a instância se ela estiver parada (e a para ao final, salvo `--manter-ligado`) e grava em
`<saida>/<arquivo>/` o PDF, o HTML, o `.PJC` exportado e um `resumo.json` com os valores do "Resumo do Cálculo".

| Variável | Padrão | Descrição |
|---|---|---|
| `PJECALC_MOTOR_DIR` | `%LOCALAPPDATA%\PJECalcFacil\motor` | Pasta da cópia dedicada ([runtime](../runtime/README.md)) |
| `PJECALC_MOTOR_PORTA` | `9357` | Porta HTTP da cópia (deve constar no `server.xml`) |
| `PJECALC_MOTOR_PORTA_SHUTDOWN` | `9356` | Porta de shutdown do Tomcat |

Uso no código (a API local fará o mesmo):

```ts
import { InstanciaPjeCalc, conectar, liquidarPjc } from '@pjecalc-facil/adaptador';

const instancia = new InstanciaPjeCalc();
await instancia.iniciar();
const operador = await conectar(instancia.url); // escolhe a implementação pela versão instalada
const r = await liquidarPjc(operador, { nome: 'calculo.PJC', tipo: 'application/octet-stream', conteudo }, { data: '2026-10-31' });
// r.resumo, r.pdf, r.html, r.pjc
```

Para mapear uma nova versão do PJe-Calc: criar `src/versoes/<versão>/` implementando `OperadorPjeCalc`, registrá-la em
`src/versoes/index.ts`, refazer os gabaritos nessa versão e rodar a regressão.

Testes:

```bash
npm test -w motor/adaptador              # unidade (sem PJe-Calc)
npm run test:regressao -w motor/adaptador # gabaritos contra o PJe-Calc real (inicia e para a instância se preciso)
```

## Responsabilidades

1. Iniciar, monitorar e parar a instância dedicada (`src/runtime`).
2. Operar o PJe-Calc por HTTP (JSF/A4J), reproduzindo as requisições do navegador, em uma sessão por tarefa (`src/nucleo`).
3. Isolar tudo o que depende das telas de cada versão (`src/versoes/<versão>`).
4. Converter relatórios e mensagens em dados estruturados, e remover o cálculo da instância ao final (`src/liquidacao.ts`).
5. Próximas fatias: fila interna, gerador de `.PJC` a partir da especificação, pendências e regerações.

## Estrutura

```text
motor/adaptador/
├── src/
│   ├── index.ts               API pública (usada pela API local e pela linha de comando)
│   ├── dominio.ts             Contrato neutro de versão: OperadorPjeCalc, CalculoPjeCalc, ResumoCalculo
│   ├── cli.ts                 Linha de comando: estado, iniciar, parar, liquidar
│   ├── liquidacao.ts          Caso de uso: liquidar um .PJC e devolver PDF, HTML, .PJC e resumo
│   ├── runtime/instancia.ts   Partida sem janela (Bootstrap do Tomcat), prontidão e parada ordenada
│   ├── nucleo/
│   │   ├── sessao-jsf.ts      Cookies, ViewState, AJAX A4J, envio de arquivo, downloads; uma requisição por vez
│   │   ├── html.ts            Campos do formulário (como o navegador envia) e mensagens do PJe-Calc
│   │   ├── telas.ts           Menu por classe/texto, radio por rótulo, exigência de sucesso, datas
│   │   └── erros.ts           ErroAdaptador com códigos estáveis
│   └── versoes/
│       ├── index.ts           Registro: lê a versão da instância e escolhe a implementação (recusa as não mapeadas)
│       └── 2.16/
│           ├── mapa.ts        Páginas, classes de menu, ids de campos e rótulos da versão 2.16
│           ├── operacoes.ts   Importar, liquidar, relatório, exportar, excluir
│           └── relatorio.ts   Leitura do "Resumo do Cálculo" do relatório HTML
└── testes/
    ├── unidade/               Testes sem PJe-Calc (inclui um servidor que imita o A4J)
    ├── gabaritos/             Cálculos de referência fictícios (.PJC + PDF + JSON) e valores esperados
    └── regressao.test.ts      Importação, liquidação e comparação ao centavo
```

## Sequência de uma liquidação

Implementada em `liquidarPjc` (passos 2 a 8; o passo 1 é da Fase 2):

1. Geração do `.PJC` de entrada a partir da especificação *(Fase 2)*
2. Importação (envio único do formulário com o arquivo, no modo "form upload" do RichFaces)
3. Regeração de ocorrências e consulta de pendências *(próxima fatia; hoje os `.PJC` importados já vêm regerados)*
4. Liquidação, com exigência da mensagem de sucesso
5. Emissão do relatório em HTML (lido para o resumo) e em PDF
6. Exportação do `.PJC` oficial
7. Exclusão do cálculo na instância, sempre, mesmo em caso de erro

## Regras de operação

- Uma sessão HTTP por tarefa, com requisições sequenciais (a sessão enfileira chamadas simultâneas).
- Erro interno do PJe-Calc vira `ErroAdaptador('MOTOR_FALHOU')`; mensagens de erro da tela, `OPERACAO_RECUSADA`.
- Itens de menu pela classe CSS (`menuImageLiquidar`…) e radios pelo rótulo exato, não pelos ids gerados (`j_idNN`).
- Opções da JVM lidas do `iniciarPjeCalc.bat` da cópia; só `java.awt.headless` e `catalina.*` são definidas aqui.
- Recusar versões do PJe-Calc sem mapeamento em `versoes/`.
- O relatório HTML é lido como UTF-8, embora o cabeçalho HTTP anuncie ISO-8859-1.
- Não gravar diretamente no banco H2.
- Operações não cobertas por HTTP podem usar Playwright como alternativa.
