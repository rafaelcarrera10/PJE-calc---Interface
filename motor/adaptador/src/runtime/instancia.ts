// Instância dedicada do PJe-Calc (cópia própria, porta própria), iniciada sem janela pelo Bootstrap do Tomcat.
//
// O lançador oficial (bin/pjecalc.jar) exige interface gráfica e não abre a porta de shutdown; por isso o Tomcat é
// iniciado diretamente, como o próprio lançador faz internamente (classe TomCat → Bootstrap.start). Validado no
// PJe-Calc 2.16.0: partida em ~11 s e parada ordenada pelo comando SHUTDOWN em ~1 s (motor/runtime/README.md).
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';
import { ErroAdaptador } from '../nucleo/erros.js';

export interface ConfigInstancia {
  /** Pasta da cópia dedicada (contém bin\, tomcat\ e .dados\). */
  pasta: string;
  portaHttp: number;
  portaShutdown: number;
  tempoLimiteInicioMs: number;
  tempoLimiteParadaMs: number;
}

export type EstadoInstancia = 'parada' | 'iniciando' | 'pronta' | 'parando' | 'falhou';

export const CAMINHO_PRONTIDAO = '/pjecalc/pages/principal.jsf';

export function configPadrao(env: NodeJS.ProcessEnv = process.env): ConfigInstancia {
  const local = env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
  return {
    pasta: path.resolve(env.PJECALC_MOTOR_DIR ?? path.join(local, 'PJECalcFacil', 'motor')),
    portaHttp: Number(env.PJECALC_MOTOR_PORTA ?? 9357),
    portaShutdown: Number(env.PJECALC_MOTOR_PORTA_SHUTDOWN ?? 9356),
    tempoLimiteInicioMs: 300_000,
    tempoLimiteParadaMs: 60_000,
  };
}

/** Confere a cópia dedicada antes de iniciar e devolve o Java e as opções da JVM lidas do iniciarPjeCalc.bat oficial. */
export function conferirInstalacao(config: ConfigInstancia): { java: string; opcoesJvm: string[] } {
  const java = path.join(config.pasta, 'bin', 'jre', 'bin', 'java.exe');
  const exigidos = [java, path.join(config.pasta, 'bin', 'lib'), path.join(config.pasta, 'tomcat', 'conf', 'server.xml'), path.join(config.pasta, '.dados', 'pjecalc.h2.db')];
  const faltando = exigidos.filter((p) => !fs.existsSync(p));
  if (faltando.length) {
    throw new ErroAdaptador('INSTALACAO_INVALIDA', `Cópia dedicada do PJe-Calc incompleta em ${config.pasta}`, { faltando });
  }
  const serverXml = fs.readFileSync(path.join(config.pasta, 'tomcat', 'conf', 'server.xml'), 'latin1').replace(/<!--[\s\S]*?-->/g, '');
  for (const porta of [config.portaHttp, config.portaShutdown]) {
    if (!serverXml.includes(`port="${porta}"`)) {
      throw new ErroAdaptador('INSTALACAO_INVALIDA', `O server.xml da cópia dedicada não usa a porta ${porta}`, { pasta: config.pasta });
    }
  }
  const bat = path.join(config.pasta, 'iniciarPjeCalc.bat');
  const opcoesJvm = fs.existsSync(bat) ? opcoesDoLancador(fs.readFileSync(bat, 'latin1')) : [];
  if (!opcoesJvm.some((o) => o.startsWith('-Dseguranca.pjecalc.tokenServicos='))) {
    throw new ErroAdaptador('INSTALACAO_INVALIDA', 'Token de serviços não encontrado no iniciarPjeCalc.bat da cópia dedicada', { bat });
  }
  return { java, opcoesJvm };
}

/**
 * Opções -D e -X do iniciarPjeCalc.bat oficial (fuso, codificação, memória, token de serviços...). Lidas do arquivo
 * da própria versão instalada para não divergirem quando o PJe-Calc for atualizado.
 */
export function opcoesDoLancador(bat: string): string[] {
  return [...bat.matchAll(/(?:^|\s)(-[DX][^\s"]*(?:"[^"]*")?)/g)].map((m) => m[1]!.replace(/"/g, ''));
}

/** Opções que este modo de partida define por conta própria e que, portanto, não vêm do .bat. */
const DEFINIDAS_AQUI = /^-D(java\.awt\.headless|catalina\.home|catalina\.base)=/;

/** Argumentos da JVM: as opções do lançador oficial, sem interface gráfica e com o Tomcat iniciado diretamente. */
export function argumentosJava(opcoesJvm: string[]): string[] {
  return [
    ...opcoesJvm.filter((o) => !DEFINIDAS_AQUI.test(o)),
    '-Djava.awt.headless=true',
    '-Dcatalina.home=tomcat',
    '-Dcatalina.base=tomcat',
    '-cp', path.join('bin', 'lib', '*'),
    'org.apache.catalina.startup.Bootstrap',
    'start',
  ];
}

export class InstanciaPjeCalc {
  private processo?: ChildProcess;
  private _estado: EstadoInstancia = 'parada';

  constructor(readonly config: ConfigInstancia = configPadrao()) {}

  get estado(): EstadoInstancia {
    return this._estado;
  }

  get url(): string {
    return `http://127.0.0.1:${this.config.portaHttp}`;
  }

  /** Inicia a instância e espera ficar pronta. Se já houver uma respondendo na porta, apenas a utiliza. */
  async iniciar(): Promise<void> {
    if (await this.respondendo()) {
      this._estado = 'pronta';
      return;
    }
    const { java, opcoesJvm } = conferirInstalacao(this.config);
    const log = path.join(this.config.pasta, 'tomcat', 'logs', 'pjecalc-facil.log');
    const fdLog = fs.openSync(log, 'a');
    this._estado = 'iniciando';
    // Desvinculado e com a saída direto no arquivo: a instância continua viva se este processo terminar
    // (ex.: comando "iniciar" da linha de comando); a parada é sempre pelo SHUTDOWN.
    const processo = spawn(java, argumentosJava(opcoesJvm), {
      cwd: this.config.pasta, windowsHide: true, detached: true, stdio: ['ignore', fdLog, fdLog],
    });
    fs.closeSync(fdLog);
    this.processo = processo;
    let saida: number | null | undefined;
    let falhaAoExecutar: Error | undefined;
    processo.once('error', (e) => {
      falhaAoExecutar = e;
      this._estado = 'falhou';
    });
    processo.once('exit', (codigo) => {
      saida = codigo;
      if (this._estado !== 'parando') this._estado = 'falhou';
    });

    const limite = Date.now() + this.config.tempoLimiteInicioMs;
    while (Date.now() < limite) {
      if (falhaAoExecutar) {
        throw new ErroAdaptador('MOTOR_FALHOU', `Não foi possível executar o Java do PJe-Calc: ${falhaAoExecutar.message}`, { java });
      }
      if (saida !== undefined) {
        throw new ErroAdaptador('MOTOR_FALHOU', `O PJe-Calc encerrou durante a partida (código ${saida})`, { log });
      }
      if (await this.respondendo()) {
        this._estado = 'pronta';
        return;
      }
      await esperar(1000);
    }
    await this.parar();
    throw new ErroAdaptador('TEMPO_ESGOTADO', `O PJe-Calc não ficou pronto em ${this.config.tempoLimiteInicioMs / 1000} s`, { log });
  }

  /**
   * Parada ordenada (comando SHUTDOWN do Tomcat), que fecha o banco H2 corretamente. Também para uma instância
   * iniciada por outro processo (ex.: um comando "iniciar" anterior), pois a decisão é pelo que responde na porta.
   */
  async parar(): Promise<void> {
    if (!this.processo && !(await this.respondendo())) {
      this._estado = 'parada';
      return;
    }
    this._estado = 'parando';
    await enviarShutdown(this.config.portaShutdown).catch(() => undefined);
    const limite = Date.now() + this.config.tempoLimiteParadaMs;
    while (Date.now() < limite && (await this.respondendo())) await esperar(500);
    if (this.processo && this.processo.exitCode === null) {
      // O temporizador do prazo é cancelado quando o processo sai, para não segurar o processo Node até o fim do prazo.
      const prazo = new AbortController();
      await Promise.race([
        once(this.processo, 'exit'),
        esperar(Math.max(0, limite - Date.now()), undefined, { signal: prazo.signal }).catch(() => undefined),
      ]);
      prazo.abort();
      if (this.processo.exitCode === null) {
        // Parada forçada: a JVM morta não remove a trava; o H2 se recupera sozinho na próxima partida.
        this.processo.kill();
        this._estado = 'parada';
        return;
      }
    }
    // O HTTP fecha antes do banco: o H2 só termina de gravar quando a JVM encerra e remove o arquivo de trava.
    const trava = path.join(this.config.pasta, '.dados', 'pjecalc.lock.db');
    const limiteTrava = Math.max(limite, Date.now() + 10_000);
    while (Date.now() < limiteTrava && fs.existsSync(trava)) await esperar(250);
    if (fs.existsSync(trava)) {
      this._estado = 'falhou';
      throw new ErroAdaptador('TEMPO_ESGOTADO', 'O PJe-Calc parou de responder, mas o banco H2 continua aberto', { trava });
    }
    this._estado = 'parada';
  }

  async respondendo(): Promise<boolean> {
    try {
      const r = await fetch(`${this.url}${CAMINHO_PRONTIDAO}`, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      await r.body?.cancel(); // só o status interessa; não baixa a página
      return r.status === 200;
    } catch {
      return false;
    }
  }
}

function enviarShutdown(porta: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = net.connect(porta, '127.0.0.1', () => s.end('SHUTDOWN', () => resolve()));
    s.setTimeout(5000, () => { s.destroy(); reject(new Error('timeout')); });
    s.on('error', reject);
  });
}

