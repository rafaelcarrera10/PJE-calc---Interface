// Linha de comando do adaptador (Fase 1 do roadmap). Exemplos, na raiz do repositório:
//   npm run motor -- iniciar
//   npm run motor -- liquidar motor/adaptador/testes/gabaritos/gabarito-1-rescisao.PJC --data 2026-10-31 --saida saida
//   npm run motor -- parar
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ErroAdaptador } from './nucleo/erros.js';
import { liquidarPjc } from './liquidacao.js';
import { InstanciaPjeCalc } from './runtime/instancia.js';
import { conectar } from './versoes/index.js';

const AJUDA = `Uso: npm run motor -- <comando> [opções]

Comandos:
  estado                         Mostra se a instância dedicada do PJe-Calc está respondendo
  iniciar                        Inicia a instância dedicada sem janela e espera ficar pronta
  parar                          Para a instância de forma ordenada
  liquidar <arquivo.PJC>         Importa, liquida e grava PDF, HTML, .PJC e resumo.json
      --data AAAA-MM-DD          Data de liquidação (obrigatória)
      --saida <pasta>            Pasta de saída (padrão: saida/)
      --manter-ligado            Não para a instância ao terminar, se ela foi iniciada pelo comando`;

async function main(argv: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { data: { type: 'string' }, saida: { type: 'string', default: 'saida' }, 'manter-ligado': { type: 'boolean', default: false }, ajuda: { type: 'boolean', short: 'h' } },
  });
  const [comando, arquivoInformado] = positionals;
  // Caminhos relativos à pasta onde o comando foi digitado (o npm -w muda o diretório para o pacote).
  const relativo = (p: string) => path.resolve(process.env.INIT_CWD ?? process.cwd(), p);
  const arquivo = arquivoInformado && relativo(arquivoInformado);
  const instancia = new InstanciaPjeCalc();

  switch (comando) {
    case 'estado':
      console.log(`${instancia.url}: ${(await instancia.respondendo()) ? 'respondendo' : 'parada'} (pasta ${instancia.config.pasta})`);
      return 0;
    case 'iniciar':
      await instancia.iniciar();
      console.log(`PJe-Calc pronto em ${instancia.url}`);
      return 0;
    case 'parar':
      await instancia.parar();
      console.log('PJe-Calc parado.');
      return 0;
    case 'liquidar': {
      if (!arquivo || !values.data) {
        console.error('Informe o arquivo .PJC e --data AAAA-MM-DD.\n\n' + AJUDA);
        return 2;
      }
      const jaLigada = await instancia.respondendo();
      if (!jaLigada) console.log('Iniciando o PJe-Calc...');
      await instancia.iniciar();
      try {
        const operador = await conectar(instancia.url);
        const resultado = await liquidarPjc(operador, { nome: path.basename(arquivo), tipo: 'application/octet-stream', conteudo: fs.readFileSync(arquivo) }, { data: values.data });
        const saida = path.join(relativo(values.saida!), path.parse(arquivo).name);
        fs.mkdirSync(saida, { recursive: true });
        for (const a of [resultado.pdf, resultado.html, resultado.pjc]) fs.writeFileSync(path.join(saida, a.nome), a.conteudo);
        const { pdf, html, pjc, ...resto } = resultado;
        fs.writeFileSync(path.join(saida, 'resumo.json'), JSON.stringify({ ...resto, arquivos: [pdf.nome, html.nome, pjc.nome] }, null, 2));
        console.log(`Liquidado em ${(resultado.duracaoMs / 1000).toFixed(1)} s (PJe-Calc ${resultado.versaoPjeCalc}).`);
        console.log(`Bruto: R$ ${resultado.resumo.brutoReclamante ?? '?'} · Líquido: R$ ${resultado.resumo.liquidoReclamante ?? '?'}`);
        console.log(`Arquivos em ${saida}`);
      } finally {
        if (!jaLigada && !values['manter-ligado']) await instancia.parar();
      }
      return 0;
    }
    default:
      console.log(AJUDA);
      return comando && !values.ajuda ? 2 : 0;
  }
}

main(process.argv.slice(2)).then(
  (codigo) => process.exit(codigo),
  (e) => {
    if (e instanceof ErroAdaptador) console.error(`[${e.codigo}] ${e.message}${e.detalhes ? `\n${JSON.stringify(e.detalhes, null, 2)}` : ''}`);
    else console.error(e);
    process.exit(1);
  },
);
