# Importações nativas por CSV

O PJe-Calc aceita CSV em 4 telas. É a forma mais robusta de carregar **volumes grandes** (anos de
histórico salarial, cartão de ponto dia a dia), em vez de preencher linha a linha.

| Importação | Tela | Parser (negócio) | Codificação | Observações |
|---|---|---|---|---|
| Histórico salarial | Histórico Salarial | `ServicoDeParsingDeHistoricoSalarial` | UTF-8 | `;`, linha 1 ignorada, sem linha vazia |
| Férias | Férias | `ServicoDeParsingDeFerias` | UTF-8 | idem; booleanos `S`/`N` |
| Faltas | Faltas | `ServicoDeParsingDeFaltas` | UTF-8 | idem |
| Cartão de ponto — quantidades | Cartão de Ponto | `ServicoDeParsingDeCartaoDePonto.importarCartaoDePonto` | ISO-8859-1 | `.csv` obrigatório, até 16 colunas, competência `MM/yyyy`; **apaga apurações de jornada existentes** |
| Cartão de ponto — jornada (horários) | Apuração do Cartão → "Importar Jornada" | `...importarJornadaCartaoDePonto` | ISO-8859-1 | Só atualiza dias **já existentes** na apuração; até 13 colunas |

Regras gerais: datas `dd/MM/yyyy` (parser **leniente**: 31/02 vira 02/03), números `#,##0.00` pt-BR,
aspas duplas removidas antes do *split*, limite de upload ≈ 20 MB (`web.xml`).

Os modelos oficiais ficam em `tomcat/webapps/pjecalc/template*/Exemplo*.csv`.

**Uso na nossa solução:** a API recebe esses dados em **JSON estruturado** e validado (datas reais, números
reais). O adaptador escolhe entre **gerar o CSV** e fazer upload, ou embutir no `.PJC` de entrada. Uma
referência detalhada do leiaute está no projeto *veritas-ai* (`docs/PJE_CALC_IMPORTACAO.md`).
