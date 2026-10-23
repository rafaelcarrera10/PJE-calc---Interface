# 01 — Visão geral

## O problema

O **PJe-Calc** é o sistema oficial de cálculos da Justiça do Trabalho, desenvolvido pelo TRT da 8ª Região
para o CSJT. A versão **Cidadão** é distribuída gratuitamente para advogados, peritos e contadores
gerarem cálculos no mesmo padrão aceito pelos tribunais (arquivo `.PJC` + relatório PDF).

Ele é poderoso e confiável, mas difícil de usar:

- **Interface de 2010.** São mais de 30 telas e abas em JSF/RichFaces, com terminologia técnica e muitos
  campos sem explicação. Exige navegador local e não funciona bem com várias abas.
- **Ordem rígida.** É preciso preencher parâmetros, depois histórico e verbas, regerar as ocorrências e só
  então liquidar. Errar uma etapa obriga a voltar e regerar tudo.
- **Desktop e um usuário só.** Roda no Windows (ou adaptado no Linux/macOS), com banco local. Não há
  colaboração, histórico de versões nem acesso remoto.
- **Nenhuma API.** Não existe forma oficial de outro sistema criar ou liquidar cálculos.

## O objetivo

Criar:

1. Uma **API** que expõe o motor do PJe-Calc de forma **programável, segura e escalável**. A especificação
   do cálculo entra em JSON; o resultado sai estruturado, com relatório PDF e `.PJC` oficial.
2. Uma **interface amigável**, construída sobre essa API, que guie o usuário em linguagem simples, valide
   enquanto ele preenche e mostre o resultado de forma compreensível.

## Princípios

| Princípio | Consequência prática |
|---|---|
| **Fidelidade ao motor oficial** | O cálculo é sempre feito pelo PJe-Calc. Não reimplementamos regras de cálculo (ver [ADR-0001](adr/0001-pjecalc-como-motor-isolado.md)). |
| **Reprodutibilidade** | Todo resultado registra a versão do PJe-Calc, o *hash* das tabelas de índices e a especificação usada. |
| **Humano no controle** | A API prepara e confere; a decisão jurídica (o que entra no cálculo) é do usuário. |
| **Segurança por isolamento** | O PJe-Calc roda numa "caixa" sem rede; só o adaptador fala com ele. |
| **Privacidade (LGPD)** | Coleta mínima, criptografia, retenção configurável, auditoria. |

## Público

**Uso pessoal** ([ADR-0006](adr/0006-uso-pessoal-local-windows.md)): o dono do projeto e uma pessoa próxima, cada um no próprio
computador **Windows**. Não é um produto para terceiros. Casos de uso: cálculos de liquidação, conferência de cálculos da
parte contrária e comparação de cenários.

## Forma de entrega

Um **app web local**: instalado no Windows, abre no navegador em `127.0.0.1` e opera o PJe-Calc oficial da mesma máquina.
Nada fica hospedado na internet.

## Fora de escopo (por enquanto)

- Reescrever o motor de cálculo (ver [ADR-0001](adr/0001-pjecalc-como-motor-isolado.md) e o projeto descontinuado
  *PJe-Calc Reborn* em [03](03-projetos-existentes.md)).
- Oferecer a ferramenta a terceiros, hospedá-la na internet ou ter vários usuários por instalação.
- Protocolar no PJe. A API entrega o `.PJC` e o PDF; o envio continua com o usuário.
- Extração automática de sentenças por IA. Está prevista como fase posterior no [roadmap](10-roadmap.md),
  como **módulo separado** que só *sugere* a especificação.
- Versão "PJe-Calc Institucional" (dos tribunais, com Oracle e login PJe).
