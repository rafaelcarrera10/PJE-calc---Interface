# 08 — Segurança e LGPD

## 1. A situação de partida: o motor é inseguro por natureza

O PJe-Calc foi feito para rodar **na máquina de uma pessoa, acessível só por ela** (`127.0.0.1`). Achados da análise:

| # | Achado | Evidência | Risco |
|---|---|---|---|
| S1 | Pilha **fora de suporte**: Java 8, Tomcat 7.0.67 (EOL 2021), Seam 2.2, JSF 1.2, RichFaces 3.3.4, Hibernate 3.3 | `WEB-INF/lib`, `bin/lib` | Sem correções de segurança |
| S2 | **RichFaces 3.3.4**: injeção de EL via `UserResource`, com execução remota de código (ex.: CVE-2018-14667) | versão do jar | **Crítico** se a interface do PJe-Calc for alcançável |
| S3 | Conector **AJP** (9258) ativo: família *Ghostcat* (CVE-2020-1938) afeta Tomcat 7 < 7.0.100 | `server.xml` | Leitura de arquivos e RCE se a porta for alcançável |
| S4 | Bibliotecas com cadeias de desserialização conhecidas: commons-collections 3.1, XStream 1.1/1.3, Groovy 1.8, BouncyCastle 1.38 | `WEB-INF/lib` | RCE via entrada maliciosa |
| S5 | **Credenciais do banco fixas e públicas**, iguais em todas as instalações | `META-INF/context.xml` | Quem acessar o H2 lê tudo |
| S6 | **Login automático** (usuário "offline"); sem autenticação real na versão Cidadão | `components.xml`, comportamento | Qualquer acesso à porta 9257 = acesso total |
| S7 | Importador de `.PJC` instancia classes **por reflexão a partir do XML** | `Importador` → `XMLImpScanProcessor` | `.PJC` malicioso como vetor |
| S8 | Dados pessoais em claro no H2 local | `.dados/pjecalc.h2.db` | Vazamento se o volume for exposto |

⚠️ *A Fase 1 inclui varredura formal (Trivy / OWASP Dependency-Check) da imagem do motor para a lista completa de CVEs.*

**Conclusão:** não dá para "consertar" o PJe-Calc, e não alteramos o programa oficial. No uso pessoal, o essencial é **mantê-lo inalcançável de fora do computador** e **confiar só no que entra pelo app**.

## 2. Proteções no cenário local (uso pessoal no Windows — ADR-0006)

O PJe-Calc já foi feito para rodar assim, só para quem está na máquina. O risco novo é a **nossa API local**: qualquer site
aberto no navegador poderia tentar chamar `http://127.0.0.1:8080`.

| Controle | Implementação |
|---|---|
| Só local | App escuta em `127.0.0.1` (nunca `0.0.0.0`); PJe-Calc dedicado também só em `127.0.0.1:9357` |
| Sem AJP | Na cópia dedicada, o `server.xml` (configuração, não código) é gravado **sem o conector AJP** |
| Anti-CSRF / *DNS rebinding* | A API recusa requisições cujo `Host` não seja `127.0.0.1:8080`/`localhost:8080` e cujo `Origin` não seja o da própria interface; **token de sessão aleatório** gerado a cada início, entregue só à interface (cookie `HttpOnly`, `SameSite=Strict`) |
| Entrada saneada | O PJe-Calc só recebe `.PJC` gerado pelo app a partir de JSON validado. `.PJC` recebido de outra pessoa passa antes pelo *parser* próprio com lista branca ([formato-pjc](02-pjecalc-por-dentro/formato-pjc.md)) |
| Sem internet para o motor | O app não depende de internet; a sincronização de tabelas do PJe-Calc é feita só quando você mandar |
| Dados em repouso | Recomendado ativar o **BitLocker** no Windows (protege notebook perdido ou roubado); pasta de dados com permissão só do usuário |
| Backups | Pacote de backup exportável (para pen drive ou nuvem **de sua escolha**). Nada é enviado automaticamente |
| Atualizações | Instalador assinado (quando possível); conferência do SHA-256 dos pacotes; aviso de nova versão sem atualização silenciosa |
| Logs | Sem CPF, nomes ou valores em claro |

### "Modo rede" (opcional, desligado por padrão)
Se um dia um computador for acessado pelo outro pela rede de casa ou do escritório: escutar só na rede local, exigir **senha**,
usar HTTPS com certificado local e **nunca** abrir porta no roteador. O PJe-Calc continua só em `127.0.0.1`.

> O desenho de isolamento para servidor (contêineres, NetworkPolicy etc.) está arquivado em `infra/futuro-servidor/`.

## 3. LGPD no uso pessoal

Os cálculos contêm dados pessoais de clientes (nome, CPF, PIS, salários) e às vezes dados sensíveis (atestados, filiação sindical).
Como a ferramenta é sua e roda no seu computador, **você (ou o escritório) é o controlador** e não há operador terceiro. Na prática:

- Guardar só o necessário; nome e CPF são **opcionais** na especificação.
- Proteger o computador (senha, BitLocker, Windows atualizado).
- Definir por quanto tempo manter cálculos de casos encerrados; o app terá "arquivar" e "excluir definitivamente".
- Ao passar cálculos para outra pessoa (inclusive o computador da sua namorada), tratar como compartilhamento de dados de clientes:
  só o necessário e com cuidado no meio de envio.
- Se no futuro entrar extração por IA, os documentos iriam para um provedor externo. Isso será uma opção explícita, nunca automática.

## 4. Checklist antes de usar com casos reais

- [ ] App e PJe-Calc dedicado escutando só em `127.0.0.1` (conferir com `netstat -ano`)
- [ ] Cópia dedicada sem conector AJP
- [ ] API recusando `Host`/`Origin` estranhos e requisições sem token
- [ ] BitLocker ativo nos dois notebooks/computadores
- [ ] Backup testado (exportar e restaurar em outra máquina)
- [ ] Logs revisados: nenhum dado pessoal em claro
