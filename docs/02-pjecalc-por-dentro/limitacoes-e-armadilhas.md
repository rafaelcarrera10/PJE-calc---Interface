# Limitações e armadilhas (lições da comunidade)

| # | Armadilha | Efeito | Como a solução trata |
|---|---|---|---|
| 1 | **Java 8 obrigatório** | Java 11+ quebra lançador/Tomcat 7 | Usar a **JRE 8 que vem com o PJe-Calc** (`bin\jre`) |
| 2 | Lançador **Swing** | Trava sem display (`JOptionPane`) | Iniciar o Tomcat direto (`Bootstrap`) ou com um iniciador próprio sem janela |
| 3 | **Monousuário** | *Presenters* `@Synchronized` (timeout de 1 s): `LockTimeoutException` com 2 requisições simultâneas | **Um job por vez** (fila interna); o adaptador serializa as ações e repete com espera quando há *lock* |
| 4 | **Uma view JSF por sessão** (`numberOfViewsInSession=1`) | Duas abas na mesma sessão se atrapalham | Uma sessão HTTP por job; nunca reutilizar entre jobs |
| 5 | **Conversa Seam** (`conversation-timeout`, *flush* `MANUAL`) | Dados não persistem se a conversa não for encerrada; a conversa expira | O adaptador fecha o fluxo exportando (`@End`) e, quando precisa, reabre o cálculo numa sessão nova |
| 6 | **Regerar** ocorrências | Alterar verbas sem regerar deixa ocorrências velhas; regerar pode sobrescrever edições manuais | O adaptador regera na ordem certa (verbas → FGTS → INSS) com "manter alterações" quando há edição mensal |
| 7 | Máscaras de campos | Valores alterados em silêncio | Releitura de cada campo depois de gravar (ou uso de `.PJC`/CSV, que não passam por máscara) |
| 8 | **Tabelas desatualizadas** ou de outro TRT | Resultado diferente | Registrar o *hash* das tabelas; sincronizar as tabelas do TRT do processo antes de liquidar |
| 9 | **Biblioteca de verbas muda** após sincronização | Gerador de `.PJC` com referências erradas | Catálogo lido do motor e versionado |
| 10 | Banco H2 travado / fechado | Após `OutOfMemoryError` o banco fecha e a app para de responder | Verificação de saúde + reinício automático do PJe-Calc dedicado; `-Xmx` adequado; cópia dedicada recriável |
| 11 | Fuso e codificação | Datas deslocadas (GMT-3) e acentos corrompidos (ISO-8859-1 × UTF-8) | Normalização na API; testes com acentos e virada de horário de verão |
| 12 | `.PJC` alterado depois de liquidado | *Hash* inválido, rejeitado no Institucional | Entregar só o `.PJC` exportado pelo motor depois de liquidar |
| 13 | Mudança de versão do PJe-Calc | IDs de tela, campos e enums mudam | Adaptador **versionado por versão do PJe-Calc** + suíte de regressão com cálculos-gabarito |
