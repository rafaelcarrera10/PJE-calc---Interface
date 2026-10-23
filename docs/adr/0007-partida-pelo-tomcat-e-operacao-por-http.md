# ADR-0007 — Partida pelo Bootstrap do Tomcat e operação por HTTP

**Status:** Aceita · **Data:** 2026-10-23 · **Complementa:** ADR-0001, ADR-0006

## Contexto
A instância dedicada do PJe-Calc precisa iniciar sem janela, parar sem corromper o banco H2 e ser operada sem
intervenção humana. Validado no Windows com o PJe-Calc 2.16.0:

- o lançador oficial (`bin\pjecalc.jar`, classe `Lancador`) exige interface gráfica (`HeadlessException` com
  `-Djava.awt.headless=true`) e não abre a porta de shutdown do Tomcat;
- internamente, o lançador só valida o banco, ajusta o `persistence.xml` quando há um `.tmp` e chama
  `org.apache.catalina.startup.Bootstrap` (classe `TomCat`);
- as telas são JSF 1.2 + RichFaces/A4J 3.3, e todas as operações necessárias (importar, liquidar, imprimir, exportar,
  excluir) funcionam por requisições HTTP comuns.

## Decisão
1. A instância dedicada é iniciada chamando `org.apache.catalina.startup.Bootstrap start` diretamente, com a JRE do
   próprio PJe-Calc, `bin\lib\*` no classpath, `catalina.home=tomcat` e as opções `-D`/`-X` lidas do
   `iniciarPjeCalc.bat` da cópia (fuso, codificação, memória e token de serviços não são fixados no código).
2. A parada usa o comando `SHUTDOWN` na porta de shutdown e só é considerada concluída quando o arquivo de trava do H2
   (`.dados\pjecalc.lock.db`) desaparece.
3. O adaptador opera o PJe-Calc por HTTP, reproduzindo o navegador (formulário completo + ViewState, `AJAXREQUEST`,
   redirecionamento `Ajax-Response`, downloads por `jsfcljs`), com **uma requisição por vez** por sessão. Playwright
   fica como alternativa apenas para operações que não funcionem por HTTP.
4. Seletores de tela ficam isolados por versão (`motor/adaptador/src/versoes/2.16/`), atrás de um contrato neutro
   (`OperadorPjeCalc` em `src/dominio.ts`); um registro escolhe a implementação pela versão lida da instância, e versões
   sem mapeamento são recusadas.

## Consequências
- ✅ Partida em ~11–17 s sem janela; parada ordenada em ~1–2 s, com o banco fechado.
- ✅ Liquidação completa (importar → liquidar → PDF/HTML → `.PJC` → excluir) em ~7–10 s por cálculo, sem navegador
  (a primeira após a partida leva ~20 s, com a JVM ainda fria).
- ✅ Os três gabaritos conferem ao centavo (`npm run test:regressao -w motor/adaptador`).
- ❌ Dependência de detalhes das telas (classes de menu, ids de campos): cada nova versão do PJe-Calc exige conferir o
  mapa e rodar a regressão antes de ser aceita.
- ❌ O relatório HTML vem em UTF-8, embora o cabeçalho HTTP anuncie ISO-8859-1; o leitor trata isso explicitamente.
