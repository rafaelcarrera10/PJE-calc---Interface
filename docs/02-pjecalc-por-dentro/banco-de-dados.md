# Banco de dados (H2 embutido)

## Conexão

- Arquivo: `.dados/pjecalc.h2.db`, formato H2 **1.3.154** (incompatível com o H2 2.x atual).
- DataSource JNDI `jdbc/pjeCalcDS` em `tomcat/webapps/pjecalc/META-INF/context.xml`. URL original
  `jdbc:h2:.dados/pjecalc` em **modo embutido**, com o arquivo travado enquanto o PJe-Calc roda.
- Usuário e senha são **fixos e iguais em todas as instalações** e aparecem em texto claro no `context.xml`
  (ver [08 — Segurança](../08-seguranca-e-lgpd.md)).
- Persistence unit `PJECALC_H2`, Hibernate com `hbm2ddl.auto=update`: o esquema é criado e atualizado pelas
  entidades JPA a cada versão.

## Regras de uso pela nossa solução

| Pode | Não pode |
|---|---|
| Ler tabelas de referência (índices, feriados, biblioteca de verbas) com o PJe-Calc **parado** ou em modo somente leitura | **Gravar cálculos direto no banco.** Isso pula as regras de negócio, quebra o *hash* e corrompe as ocorrências |
| Ler o *hash* e a versão das tabelas para registrar no resultado | Alterar tabelas de índices à mão |
| Manter a cópia dedicada do PJe-Calc (com seu `.h2.db`) separada do PJe-Calc normal | Compartilhar o mesmo arquivo entre duas instâncias |

## Tabelas (151) por grupo

Convenção de colunas: `IID*` = id inteiro, `DDT*` = data, `MVL*` = valor monetário, `RVL*` = real,
`SFL*` = *flag* (S/N), `STP*` = tipo (enum), `SDS*` = descrição, `SCD*` = código, `IQT*` = quantidade.

| Grupo | Tabelas (exemplos) |
|---|---|
| **Cálculo (cabeçalho)** | `TBCALCULO` (41 colunas: admissão, demissão, ajuizamento, prescrição, carga horária, município, regime, data de liquidação, `SCDHASHLIQUIDACAO`, `SFLHASHCALCULOCORRETO`, `SDSVERSAOSISTEMALIQUIDACAO`...), `TBPROCESSOCALCULO`, `TBADVOGADO`, `TBCALCULOSRECENTESUSUARIO` |
| **Verbas e ocorrências** | `TBVERBACALCULO`, `TBOCORRENCIAVERBA`, `TBITEMBASEVERBA`, `TBFORMULA`, `TBTERMODIVISOR`, `TBTERMOQUANTIDADE`, `TBVINCULOHISTORICOVERBA`, `TBVINCULOCARTAODEPONTOVERBA` |
| **Insumos** | `TBHISTORICOSALARIAL`, `TBOCORRENCIAHISTORICOSALARIAL`, `TBFALTACALCULO`, `TBFERIASCALCULO`, `TBCARTAODEPONTO`, `TBAPURACAOCARTAODEPONTO`, `TBAPURACAODIARIACARTAO`, `TBOCORRENCIAJORNADA`, `TBPREENCHIMENTOCARTAO` |
| **Encargos e acessórios** | `TBFGTSCALCULO`, `TBOCORRENCIAFGTS`, `TBINSSCALCULO`, `TBINSSSALARIOSDEVIDOS`, `TBINSSSALARIOSPAGOS`, `TBIMPOSTORENDACALCULO`, `TBHONORARIOCALCULO`, `TBMULTACALCULO`, `TBCUSTASCALCULO`, `TBPENSAOALIMENTICIACALCULO`, `TBPREVIDENCIAPRIVADACALCULO`, `TBSALARIOFAMILIA`, `TBSEGURODESEMPREGO` |
| **Correção e juros do cálculo** | `TBPARAMATUALIZACAOCALCULO`, `TBAPURACAOJUROSCALCULO`, `TBCOMBINACAOINDICE`, `TBCOMBINACAOJUROS`, `TBEXCECAO*` |
| **Execução / pagamentos** | `TBPAGAMENTO`, `TBATUALIZACAO`, `TBVALORPAGO`, `TBPARCEATUALIZ*`, `TBCREDITORECLAMANTEPAG`, `TBCUSTAS*ATUALIZACAO`, `TBOCORRENCIAIRPF*` |
| **Tabelas de índices** | `TBIPCAE`, `TBIPCA`, `TBINPC`, `TBIGPM`, `TBIPC`, `TBTR`, `TBSELICDIARIA`, `TBSELICFAZENDA`, `TBTABELAUNICAJTMENSAL`, `TBTABELAUNICAJTDIARIA`, `TBJAM`, `TBTUACDT`, `TBUFIR`, `TBCOEFICIENTEUFIR`, `TBTABELAPRECATORIO*` |
| **Tabelas de juros** | `TBJUROSPADRAO`, `TBJUROSFAZENDAPUBLICA`, `TBJUROSTAXALEGAL`, `TBJUROSSELICINSS`, `TBJUROSSELICIRPF` |
| **Tabelas legais** | `TBSALARIOMINIMONACIONAL`, `TBTABELAINSSSEGURADOEMPREGADO`, `TBTABELAINSSEMPREGADODOMESTICO`, `TBTABELABASETETOINSS`, `TBTABELAIMPOSTORENDA`, `TBTABELASALARIOFAMILIA`, `TBTABELASEGURODESEMPREGO`, `TBALIQUOTA*`, `TBATIVIDADEECONOMICA`, `TBTAXAMULTAINSS` |
| **Cadastros** | `TBVERBA` (**biblioteca de verbas** do "Lançamento Expresso", ≈170 verbas), `TBVERBABASE`, `TBFERIADO`, `TBMUNICIPIO`, `TBESTADO`, `TBASSUNTOCNJ`, `TBSALARIOCATEGORIA` (pisos), `TBVALETRANSPORTE`, `TBPARAMETROCUSTAS` |
| **Controle** | `TBCONTROLEATUALIZTABELAS` (versão/hash das tabelas sincronizadas), `TBHISTORICOVALIDACAO`, `TBAUDITORIA`, `TBLOGINFRA`, `TB_UTIL_ESQUEMA`, `TB_UTIL_TABELAMIGRACAO`, `TB_UTIL_TABELALIMPEZA` |
| **Usuário** | `TBUSUARIO`, `TBPERFIL`, `TBSETORUSUARIO` |

## Implicações para a API

1. **A biblioteca de verbas muda com a sincronização de tabelas** (nomes, incidências, reflexos). O catálogo de
   verbas exposto pela API precisa vir do motor em execução e ser versionado junto com o *hash* das tabelas.
2. **Feriados e tabelas regionais dependem do TRT.** Um cálculo do TRT4 liquidado com as tabelas regionais do
   TRT8 dá resultado diferente. O app precisa saber **qual regional** está carregada no PJe-Calc dedicado e avisar antes de liquidar.
3. O banco do motor é **descartável**: a fonte da verdade é o banco do app (SQLite). Cada *job* importa,
   processa, exporta e apaga o cálculo do motor.
