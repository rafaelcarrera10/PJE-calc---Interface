# ADR-0006 — Uso pessoal, app web local no Windows nativo

**Status:** Aceita · **Data:** 2026-10-22 · **Substitui em parte:** ADR-0002 (infra), ADR-0004 (*pool*)

## Contexto
O dono do projeto decidiu que a ferramenta é **só para uso próprio** (e de uma pessoa próxima, em outro computador), não para
terceiros. As máquinas-alvo rodam **Windows nativo**, a plataforma oficial do PJe-Calc. O desenvolvimento pode acontecer no Mac.

## Decisão
1. **App web local**: um único programa roda no próprio Windows, serve a **interface** e a **API** em `http://127.0.0.1:<porta>`
   e opera o PJe-Calc instalado na mesma máquina. Nada é hospedado na internet.
2. **Sem Docker, sem nuvem, sem login de usuários, sem fila externa**: SQLite + pasta de arquivos locais; fila interna (um job por vez).
3. **Instância dedicada do PJe-Calc** para o app: cópia do PJe-Calc oficial **do próprio usuário** em `%LOCALAPPDATA%\PJECalcFacil\motor\`,
   em **porta própria** (ex.: 9357). O PJe-Calc "normal" do usuário (9257) continua intacto e pode ser usado em paralelo, sem
   disputa de porta nem de banco H2.
4. O PJe-Calc é iniciado **sem janela** pelo app, usando a **JRE 8 que vem com ele** (`bin\jre\bin\java.exe`).
5. **Instalador Windows** (Inno Setup) com Node portátil embutido, atalho no Menu Iniciar e na Área de Trabalho. Instala-se em
   cada computador; o PJe-Calc oficial é baixado do TRT8 em cada máquina.
6. Cada computador tem **seus próprios dados**. A troca de cálculos é feita por **exportar/importar `.PJC`** (e, no futuro, um pacote
   de backup). O "modo rede" (uma máquina central acessada pela outra) fica como opção futura.

## Consequências
- ✅ Muito mais simples: some multi-inquilino, OIDC, Redis, Postgres, S3, Kubernetes.
- ✅ Pendência legal resolvida: uso pessoal do PJe-Calc Cidadão, sem redistribuir binários.
- ✅ Dados de clientes nunca saem da máquina.
- ❌ Atualizar = instalar a nova versão em cada computador (mitigado por aviso de atualização no app).
- ❌ Desenvolvimento no Mac precisa de um **motor simulado** (respostas gravadas dos gabaritos); testes reais só no Windows.
- O desenho anterior (servidor, Docker, *pool*) foi **arquivado** em `infra/futuro-servidor/` e `motor/runtime/futuro-docker/`.
