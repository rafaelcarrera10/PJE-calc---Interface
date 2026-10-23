# Fontes

## Programa oficial
- PJe-Calc Cidadão (TRT8): página de instalação `https://www.trt8.jus.br/pjecalc-cidadao/instalando-o-pje-calc-cidadao`;
  instaladores em `https://www.trt8.jus.br/sites/portal/files/roles/pje-calc/`.
- Análise local (somente leitura) de uma distribuição publicada em repositório da comunidade (jars 2.14.0): `javap`,
  `server.xml`, `context.xml`, `components.xml`, `web.xml`, `persistence.xml`, esquema do H2 (151 tabelas), `pages/*.xhtml`.
- Manual e tutorial oficiais (citados pela comunidade): `pje.csjt.jus.br/manual/index.php/PJe-Calc-Tutorial`.

## Projetos da comunidade estudados (GitHub, out/2026)
| Repositório | Uso no estudo |
|---|---|
| lucianumm/PJeCalcMCP | Driver HTTP JSF, formato `.PJC`, ciclo de vida sem janela, serviços REST internos, H2 |
| bragabarreto/pjecalc-agente | Deploy em Docker, armadilhas de Seam (`@Synchronized`, conversa, flush) |
| davipavanin/pjecalc-preenchedor | Mapas de campos da 2.16.0, boas práticas de preenchimento |
| VictorAndradeXD/PJE-Calc-Reborn | Motor headless para *golden tests*, limites da reescrita |
| magal-dev/veritas-ai | Leiaute das importações CSV (2.16.0) |
| lucianum7/CalculadoraTrabalhista | Rastreabilidade e auditoria independentes |
| 20129962-5/rb_pjecalc, LCFJunior/Automacao_PJECALC, alexandre575/agentepjecalk, adrianomatinada/pjecalc-, iurisant/pjecalc-web | Abordagens de automação e extração |
| biglinux/pjecalc-instalador, heraclitothiago/pjecalc-ubuntu, DiegoRibeirodeSouza/pjecalc-instalador-linux, krymancer/pjecalc-cidadao-bin, oliveiracarlosadv/PJE-Calc-Cidad-o-2.16.0---Apple-Silicon, LibraeOrg/pjecalc-installer-mirror | Execução em Linux/macOS, JRE 8, extração do instalador |

## Normas citadas
- LGPD (Lei 13.709/2018); Lei 9.609/1998 (software); ADC 58/59 (STF); Lei 14.905/2024; RFC 9457 (Problem Details).
