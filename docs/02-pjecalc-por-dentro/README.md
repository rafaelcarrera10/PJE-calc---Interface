# O PJe-Calc por dentro

Análise técnica do PJe-Calc Cidadão realizada somente por leitura: estrutura de pastas, arquivos de configuração,
bytecode (`javap`), banco H2 e telas. Foram analisados os jars da versão 2.14.0 e documentação de terceiros sobre as
versões 2.15.1 e 2.16.0 (atual em outubro de 2026). A arquitetura é a mesma nas três versões.

| Documento | Conteúdo |
|---|---|
| [arquitetura.md](arquitetura.md) | Pastas, inicialização, tecnologias, camadas e classes principais |
| [banco-de-dados.md](banco-de-dados.md) | Banco H2, 151 tabelas, convenções de nomes, tabelas de índices |
| [telas-e-fluxo.md](telas-e-fluxo.md) | Mapa das telas, ordem de preenchimento e liquidação |
| [formato-pjc.md](formato-pjc.md) | Formato do arquivo `.PJC` e *hash* da liquidação |
| [servicos-rest-internos.md](servicos-rest-internos.md) | Serviços REST existentes (SELIC, precatórios, tabelas) |
| [importacao-csv.md](importacao-csv.md) | Importações nativas: histórico salarial, férias, faltas e cartão de ponto |
| [limitacoes-e-armadilhas.md](limitacoes-e-armadilhas.md) | Limitações para automação e formas de contorno |

## Resumo

1. Aplicação web Java (JBoss Seam 2.2, JSF 1.2, RichFaces 3.3, Hibernate 3.3) executada em um Tomcat 7.0.67 embarcado,
   com banco H2 1.3.154 em arquivo local.
2. Um lançador Swing (`bin/pjecalc.jar`, classe `br.jus.trt8.pjecalcsa.container.Lancador`) inicia o Tomcat, exibe um
   ícone na bandeja e abre o navegador em `http://localhost:9257/pjecalc`.
3. Requer Java 8; versões 11 ou superiores são incompatíveis com o lançador e com o Tomcat 7.
4. As regras de negócio estão em `pjecalc-negocio-<versão>.jar` (cerca de 1.400 classes); a liquidação é feita por
   `Calculo.liquidar()`.
5. Não há API de cálculo: criação, regeração, liquidação e exportação ocorrem apenas pelas telas (classes `Apresentador*`).
6. Os serviços REST existentes (`/pjecalc/servico/rest/...`) tratam somente de SELIC, precatórios e sincronização de tabelas.
7. O cálculo pode ser exportado e importado como `.PJC` (ZIP com XML que reflete as entidades JPA).
8. Na liquidação, o PJe-Calc registra um *hash* e a versão do sistema, o que permite ao PJe-Calc Institucional
   reconhecer um cálculo legítimo.
9. O sistema é monousuário: estado JSF mantido no servidor com uma única *view* por sessão, componentes `@Synchronized`
   e banco H2 com bloqueio de arquivo.
10. As tabelas (índices, INSS, IR, feriados, salário mínimo etc.) ficam no banco e são atualizadas por sincronização com
    o TRT8 ou o TRT regional.
