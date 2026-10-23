# Interface

Interface web do PJE Calc Fácil, desenvolvida em React, TypeScript e Vite. Toda a lógica de dados e validação está na
[API](../api/README.md); a interface não executa cálculos.

Especificação de UX e telas: [`docs/07-interface`](../docs/07-interface/README.md).

## Status

Versão 0.1. Todas as etapas do assistente estão implementadas, exceto o resultado da liquidação, que depende da
integração com o PJe-Calc.

## Execução

Os comandos são executados na raiz do repositório:

```bash
npm install
npm run dev      # http://localhost:5173 (requisições /v1 são encaminhadas à API na porta 8080)
npm run build    # gera interface/dist, servida pela API em http://127.0.0.1:8080
```

Navegadores suportados: Google Chrome e Microsoft Edge. O Safari não oferece o seletor de mês usado na etapa Salários.

## Telas

| Tela | Conteúdo |
|---|---|
| Meus cálculos | Lista, busca, criação, duplicação, exclusão e importação de especificação `.json` |
| Processo e partes | Número CNJ com máscara e conferência do dígito verificador; sugestão do TRT; CPF e CNPJ opcionais |
| Contrato | Datas, forma de rescisão e aviso prévio; indicação do marco da prescrição quinquenal |
| Local e jornada | UF, município, feriados, carga horária, sábado útil, prescrição, período do cálculo |
| Salários | Históricos salariais por período, colagem de planilha, indicação de FGTS e INSS recolhidos |
| Verbas deferidas | Busca na biblioteca de verbas, parâmetros sugeridos por tipo de verba e seleção de reflexos |
| Faltas e férias | Faltas e períodos aquisitivos (cartão de ponto previsto para versão futura) |
| FGTS, IR e honorários | Alíquota e multa do FGTS, imposto de renda e honorários |
| Correção e juros | Modelos de correção (TST após a Lei 14.905/2024; ADC 58/59) e tabela editável por período |
| Revisão | Pendências e avisos com acesso direto ao campo; resumo completo do cálculo |
| Liquidar | Data de liquidação, envio ao PJe-Calc, exportação da especificação e histórico de versões |

Comportamentos gerais:

- salvamento automático, com indicação da versão salva;
- validação contínua, com contagem de pendências por etapa e mensagens exibidas no próprio campo;
- valores monetários exibidos no formato brasileiro e enviados à API como decimal com ponto;
- indicador do estado do PJe-Calc no cabeçalho;
- tema escuro conforme a preferência do sistema.

## Estrutura

```text
interface/src/
├── main.tsx, App.tsx          Inicialização, rotas e cabeçalho
├── api.ts                     Cliente da API
├── tipos.ts                   Tipos da especificação de cálculo
├── componentes/               Campos de formulário e indicador do motor
├── paginas/                   Lista de cálculos e editor (salvamento e validação)
├── etapas/                    Uma tela por etapa do assistente
├── util/                      Formatação pt-BR e JSON Merge Patch
└── estilos.css
```
