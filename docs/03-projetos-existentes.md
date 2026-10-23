# 03 — Projetos existentes (estado da arte, out/2026)

Foram levantados os repositórios públicos do GitHub com "pjecalc" / "pje-calc" e estudados os 17 mais relevantes.
**Nenhum oferece uma API REST multiusuário de cálculo**: são robôs locais, servidores MCP para assistentes de IA,
instaladores ou motores alternativos.

## Classificação por abordagem

| Abordagem | Projetos | Ideia central |
|---|---|---|
| **A. Driver HTTP da interface + `.PJC` gerado** | `lucianumm/PJeCalcMCP` (JS, **AGPL-3.0**) | Gera o `.PJC` a partir de uma especificação JSON, importa por HTTP (imitando o navegador: ViewState, A4J), regera, liquida, imprime e exporta. Inicia o PJe-Calc sem janela. **É a abordagem mais madura.** |
| **B. Navegador automatizado (Playwright/Selenium)** | `bragabarreto/pjecalc-agente` (Python, MIT), `davipavanin/pjecalc-preenchedor` (JS, MIT), `20129962-5/rb_pjecalc` (Python/Selenium), `alexandre575/agentepjecalk` (Python, MIT) | Um navegador real preenche tela por tela. Fácil de começar, frágil e lento. O *pjecalc-agente* roda o PJe-Calc em contêiner na nuvem. |
| **C. RPA de tela (cliques por imagem)** | `LCFJunior/Automacao_PJECALC` (PyAutoGUI) | Reconhece botões por imagem. Muito frágil; não serve para servidor. |
| **D. Reescrever o motor** | `VictorAndradeXD/PJE-Calc-Reborn` (C#/.NET 10, **descontinuado** set/2026), `lucianum7/CalculadoraTrabalhista` (Python, motor independente) | Reimplementar as regras. O *Reborn* validou 21 núcleos com 569 testes de paridade e mesmo assim parou incompleto. Mostra o tamanho do desafio. |
| **E. Extração por IA → dados para o PJe-Calc** | `magal-dev/veritas-ai` (cartões e holerites → CSV), `adrianomatinada/pjecalc-` (Gemini → `.pjc`/scripts), `iurisant/pjecalc-web` (importa e exporta `.PJC` no navegador) | Foco na entrada de dados, não no motor. |
| **F. Empacotamento / instaladores** | `biglinux/pjecalc-instalador`, `heraclitothiago/pjecalc-ubuntu`, `DiegoRibeirodeSouza/pjecalc-instalador-linux`, `krymancer/pjecalc-cidadao-bin` (Arch), `oliveiracarlosadv/...Apple-Silicon`, `LibraeOrg/pjecalc-installer-mirror` | Fazem o PJe-Calc rodar em Linux/macOS com **JRE 8** e mostram como extrair o instalador oficial. |

## O que aproveitamos de cada um

| Projeto | Lição aproveitada | Cuidado |
|---|---|---|
| **PJeCalcMCP** | (1) A sequência confiável: **gerar `.PJC` → importar → passos pós-importação → regerar → validar → liquidar → exportar "PRONTO"**; (2) driver HTTP de JSF/A4J sem navegador; (3) iniciar sem janela + parada ordenada (H2 fecha limpo); (4) leitura e verificação de relatórios; (5) catálogo de verbas lido do motor do usuário; (6) diagnóstico de logs (OOM, banco fechado) | Licença **AGPL-3.0**: copiar o código para um serviço em rede obriga a publicar o nosso código. **Estudamos e reimplementamos; não copiamos** (ver [09](09-aspectos-legais.md)). Feito para Windows e um usuário. |
| **pjecalc-agente** | Rodar o PJe-Calc em **Docker na nuvem** (Bootstrap direto do Tomcat, JRE 8, *watchdog*); a armadilha do `@Synchronized`/`LockTimeoutException`; ajustes em `components.xml` | **Redistribui os binários do PJe-Calc** no repositório e altera configurações internas (flush AUTO, H2 em modo TCP), o que muda o comportamento do motor. Nós **não alteramos o PJe-Calc**. |
| **pjecalc-preenchedor** | Mapa de IDs de campos da 2.16.0 (`docs/pesquisa/mapa-2.16.0/*.json`); "reler o campo depois de digitar"; recusar versões não testadas; não exportar sem liquidar | Automação de navegador (fallback apenas) |
| **PJe-Calc Reborn** | Técnica de **valores-gabarito** (*golden tests*) rodando o motor oficial; exportação das tabelas de referência via `org.h2.tools.RunScript` | Prova de que reescrever o motor é inviável no nosso escopo |
| **veritas-ai** | Leiaute exato das importações CSV (2.16.0) | — |
| **Instaladores Linux/macOS** | Extração do instalador oficial, JRE 8 Temurin, scripts de início | Base do modo servidor arquivado (`motor/runtime/futuro-docker/`) |
| **CalculadoraTrabalhista** | Rastreabilidade (manifesto com *hashes* de fatos, regras e tabelas) e auditoria independente | Motor próprio, sem vínculo com o PJe-Calc |

## Lacunas que o nosso projeto preenche

> Com a [ADR-0006](adr/0006-uso-pessoal-local-windows.md) (uso pessoal), o foco é o item 3 em diante. Os itens 1 e 2 só valeriam num modo servidor.

1. **API de serviço** multiusuário e multi-inquilino (escritórios), com autenticação, fila e histórico.
2. **Escala horizontal**: *pool* de motores isolados, em vez de "o PJe-Calc da máquina do usuário".
3. **Contrato público e estável** (OpenAPI + JSON Schema) que isola a interface das mudanças do PJe-Calc.
4. **Segurança e LGPD** levadas a sério (nenhum projeto aborda isso de forma sistemática).
5. **Interface pensada para leigos**, desacoplada do motor.
