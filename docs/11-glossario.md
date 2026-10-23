# 11 — Glossário

| Termo | Significado |
|---|---|
| **PJe-Calc** | Sistema oficial de cálculos da Justiça do Trabalho (TRT8/CSJT). **Cidadão** = versão gratuita para advogados e peritos; **Institucional** = versão interna dos tribunais |
| **Liquidação** | Apuração do valor devido numa data (data de liquidação), com correção e juros |
| **`.PJC`** | Arquivo de cálculo do PJe-Calc (ZIP + XML) que se junta ao processo |
| **Verba** | Parcela deferida (ex.: horas extras, adicional de insalubridade, aviso prévio) |
| **Reflexo** | Repercussão de uma verba em outras (ex.: horas extras em 13º, férias, FGTS, RSR) |
| **Lançamento Expresso** | Inclusão rápida de verbas a partir da biblioteca padrão do PJe-Calc |
| **Ocorrências** | Linhas mês a mês geradas para cada verba; **Regerar** = recriá-las depois de mudar parâmetros |
| **Histórico salarial** | Bases salariais por competência usadas para calcular as verbas |
| **Competência** | Mês/ano de referência (ex.: 03/2024) |
| **Divisor / multiplicador / quantidade** | Termos da fórmula da verba (ex.: salário ÷ 220 × 1,5 × horas) |
| **Prescrição quinquenal** | Limite de 5 anos antes do ajuizamento para cobrança de verbas |
| **Índices de correção** | IPCA-E, SELIC, TR, Taxa Legal etc.; regra atual decorre da ADC 58/59 do STF e da Lei 14.905/2024 |
| **Contribuição social** | INSS do empregado e do empregador sobre as verbas salariais |
| **TRT / regional** | Tribunal Regional do Trabalho (TRT1 a TRT24); define feriados e tabelas regionais |
| **Sincronização de tabelas** | Atualização de índices e tabelas legais a partir do servidor do tribunal |
| **Especificação de cálculo** | (Nosso) JSON que descreve o cálculo, independente das telas do PJe-Calc |
| **Motor** | (Nosso) instância isolada do PJe-Calc oficial que executa as liquidações |
| **Adaptador** | (Nosso) componente que traduz a especificação e opera o motor |
| **Job** | (Nosso) tarefa assíncrona (liquidar, validar no motor, importar) |
| **Inquilino** | (Nosso) escritório/organização cliente, com dados isolados |
| **Seam / JSF / RichFaces / A4J** | Frameworks Java web antigos usados pelo PJe-Calc |
| **ViewState** | Identificador do estado da tela JSF que precisa acompanhar cada requisição |
| **H2** | Banco de dados Java embutido usado pelo PJe-Calc Cidadão |
| **ADR** | *Architecture Decision Record*: registro curto de uma decisão de arquitetura |
