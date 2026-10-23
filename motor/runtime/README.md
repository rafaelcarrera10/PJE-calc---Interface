# Runtime do PJe-Calc

Execução da instância dedicada do PJe-Calc Cidadão utilizada pela aplicação.

**Status:** em projeto. Os itens listados em *Pendências de validação* devem ser confirmados no Windows de destino.

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

## Pendências de validação

- Forma de iniciar sem janela: Tomcat direto (`org.apache.catalina.startup.Bootstrap` com `bin\lib\*.jar`) ou iniciador
  Java próprio que reproduz os passos do lançador oficial sem Swing.
- Se o lançador oficial (`TrocadorConfig`) altera portas ou o `persistence.xml` ao iniciar.
- Parada ordenada pelo comando `SHUTDOWN` na porta 9356, com fechamento correto do arquivo `.h2.db`.
- Tempos de inicialização (estimativa de 1 a 3 minutos) e de liquidação.
- Comportamento do firewall do Windows na primeira execução do `java.exe`; o acesso à rede deve ser negado, pois o uso é local.
