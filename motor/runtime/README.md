# Runtime do PJe-Calc

Execução da instância dedicada do PJe-Calc Cidadão utilizada pela aplicação.

**Status:** partida sem janela e parada ordenada implementadas em
[`motor/adaptador/src/runtime/instancia.ts`](../adaptador/src/runtime/instancia.ts) (`npm run motor -- iniciar|parar|estado`).
A criação da cópia dedicada ainda é manual (será feita pelo instalador). Decisão em
[ADR-0007](../../docs/adr/0007-partida-pelo-tomcat-e-operacao-por-http.md).

## Instância dedicada

| Item | Valor |
|---|---|
| Origem | Instalação oficial do PJe-Calc Cidadão obtida no site do TRT8 (ex.: `C:\pjecalc-windows64-2.16.x\`) |
| Cópia | `%LOCALAPPDATA%\PJECalcFacil\motor\`, criada pelo instalador e recriável a qualquer momento |
| Portas | HTTP 9357 e shutdown 9356, apenas em `127.0.0.1` (a instalação original permanece na 9257) |
| AJP | Removido do `server.xml` da cópia |
| Java | JRE 8 distribuída com o PJe-Calc (`motor\bin\jre\bin\java.exe`) |
| Memória | `-Xms1024m -Xmx2048m` (padrão do `iniciarPjeCalc.bat`) |
| JVM | `-Duser.timezone=GMT-3 -Dfile.encoding=ISO-8859-1 -Djava.awt.headless=true` e token aleatório dos serviços REST |

## Ciclo de vida

```mermaid
stateDiagram-v2
    [*] --> parado
    parado --> iniciando: abertura do app ou primeiro cálculo
    iniciando --> pronto: GET /pjecalc/pages/principal.jsf = 200
    iniciando --> falhou: tempo limite (5 min) ou erro no log
    pronto --> ocupado: tarefa em execução
    ocupado --> pronto
    pronto --> parando: encerramento do app
    parando --> parado: parada ordenada (H2 fechado corretamente)
    falhou --> parado: diagnóstico e reinício
```

## Partida e parada

- **Partida:** `java -Djava.awt.headless=true … -Dcatalina.home=tomcat -cp bin\lib\* org.apache.catalina.startup.Bootstrap start`,
  executado na pasta da cópia (o banco é aberto pelo caminho relativo `jdbc:h2:.dados/pjecalc`), com os parâmetros do
  `iniciarPjeCalc.bat` oficial. O processo é desvinculado e grava em `tomcat\logs\pjecalc-facil.log`.
- **Prontidão:** `GET /pjecalc/pages/principal.jsf` = 200 (≈11–17 s).
- **Parada:** comando `SHUTDOWN` na porta 9356; concluída quando `.dados\pjecalc.lock.db` desaparece (≈1–2 s).

## Pendências de validação

- Comportamento do firewall do Windows na primeira execução do `java.exe`; o acesso à rede deve ser negado, pois o uso é local.
- Recriação automática da cópia dedicada (instalador): cópia da instalação oficial, troca das portas e remoção do AJP.

## Validado no Windows (23/10/2026, PJe-Calc 2.16.0)

- O lançador oficial (`java -jar bin\pjecalc.jar`) respeita as portas alteradas no `server.xml` da cópia: a instância
  atendeu em 9357 sem tocar na instalação original.
- O lançador **não roda com `-Djava.awt.headless=true`** (`HeadlessException`) e **não abre a porta de shutdown**;
  por isso o Tomcat é iniciado diretamente (seção acima), o que resolve os dois pontos.
- A propriedade `-Dseguranca.pjecalc.tokenServicos` do `iniciarPjeCalc.bat` é obrigatória para a atualização online de
  tabelas.
- Uma instalação nova vem **sem índices de correção e juros**; é preciso executar "Atualização de Tabelas e Índices"
  antes de liquidar.
- Tempos: inicialização em 10 a 14 s; liquidação em cerca de 2,5 s.
- Operação pela interface web e particularidades do JSF: ver [gabaritos](../adaptador/testes/gabaritos/README.md).
