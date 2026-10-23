# Instalador para Windows

**Status:** planejado.

Instalador (`PJECalcFacil-Setup-x.y.z.exe`, gerado com Inno Setup) para configurar a aplicação em cada computador.

## Pré-requisito

PJe-Calc Cidadão oficial, obtido no site do TRT8, instalado no computador. O instalador não inclui o PJe-Calc
([aspectos legais](../docs/09-aspectos-legais.md)).

## Etapas da instalação

1. Instalação da aplicação em `C:\Program Files\PJE Calc Fácil\`, com Node.js portátil incluído.
2. Localização do PJe-Calc (pastas que contenham `bin\pjecalc.jar` e `tomcat\`); havendo mais de uma, o usuário escolhe.
3. Criação da cópia dedicada em `%LOCALAPPDATA%\PJECalcFacil\motor\`, na porta 9357 e sem conector AJP.
4. Criação das pastas `%LOCALAPPDATA%\PJECalcFacil\dados\` e `Documentos\PJE Calc Fácil\`.
5. Atalhos no Menu Iniciar e na Área de Trabalho.
6. Teste de inicialização do motor e conferência da versão.

A desinstalação remove a aplicação e, apenas se selecionado, os dados e a cópia dedicada. A instalação original do
PJe-Calc não é alterada.

## Atualizações

- **Aplicação:** executar o novo instalador sobre a versão anterior; os dados são preservados.
- **PJe-Calc:** instalar a nova versão oficial e recriar a cópia dedicada em *Configurações → Motor*. Somente versões com
  mapeamento no adaptador são aceitas, após execução dos cálculos de referência.

## Transferência entre computadores

- Um cálculo: exportar a especificação (`.json`) ou o `.PJC` e importar no outro computador.
- Todos os cálculos: backup e restauração (planejado).
