import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { argumentosJava, configPadrao, conferirInstalacao, opcoesDoLancador } from '../../src/runtime/instancia.js';
import { ErroAdaptador } from '../../src/nucleo/erros.js';

// Linha do iniciarPjeCalc.bat do PJe-Calc 2.16.0 (token trocado).
const BAT_OFICIAL = '@echo\r\nset local=%~dp0\r\ncd %local%\r\nstart bin\\jre\\bin\\javaw -splash:pjecalc_splash.gif -Duser.timezone=GMT-3 '
  + '-Dfile.encoding=ISO-8859-1 -Dseguranca.pjecalc.tokenServicos=TOKEN123 -Dseguranca.pjekz.servico.contexto="https://pje.trtXX.jus.br/pje-seguranca" '
  + '-Xms1024m -Xmx2048m -XX:MaxPermSize=512m -jar bin\\pjecalc.jar\r\n';

function copiaFalsa(serverXml = '<Server port="9356"><Connector port="9357"/></Server>'): string {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'pjecalc-motor-'));
  for (const d of ['bin/jre/bin', 'bin/lib', 'tomcat/conf', '.dados']) fs.mkdirSync(path.join(pasta, d), { recursive: true });
  fs.writeFileSync(path.join(pasta, 'bin/jre/bin/java.exe'), '');
  fs.writeFileSync(path.join(pasta, '.dados/pjecalc.h2.db'), '');
  fs.writeFileSync(path.join(pasta, 'tomcat/conf/server.xml'), serverXml);
  fs.writeFileSync(path.join(pasta, 'iniciarPjeCalc.bat'), BAT_OFICIAL);
  return pasta;
}

test('config: pasta e portas vêm das variáveis de ambiente, com padrões da ADR-0006', () => {
  const padrao = configPadrao({ LOCALAPPDATA: 'C:\\Dados' });
  assert.equal(padrao.pasta, path.resolve('C:\\Dados', 'PJECalcFacil', 'motor'));
  assert.equal(padrao.portaHttp, 9357);
  assert.equal(padrao.portaShutdown, 9356);
  assert.equal(configPadrao({ PJECALC_MOTOR_DIR: 'D:\\motor', PJECALC_MOTOR_PORTA: '9400' }).portaHttp, 9400);
});

test('lançador: lê as opções -D/-X do .bat oficial, sem aspas e sem splash/-jar', () => {
  assert.deepEqual(opcoesDoLancador(BAT_OFICIAL), [
    '-Duser.timezone=GMT-3',
    '-Dfile.encoding=ISO-8859-1',
    '-Dseguranca.pjecalc.tokenServicos=TOKEN123',
    '-Dseguranca.pjekz.servico.contexto=https://pje.trtXX.jus.br/pje-seguranca',
    '-Xms1024m',
    '-Xmx2048m',
    '-XX:MaxPermSize=512m',
  ]);
});

test('instalação: aceita a cópia completa e usa as opções do iniciarPjeCalc.bat', () => {
  const pasta = copiaFalsa();
  const r = conferirInstalacao({ ...configPadrao({}), pasta });
  assert.ok(r.opcoesJvm.includes('-Dseguranca.pjecalc.tokenServicos=TOKEN123'));
  assert.equal(r.java, path.join(pasta, 'bin', 'jre', 'bin', 'java.exe'));
  const semToken = copiaFalsa();
  fs.writeFileSync(path.join(semToken, 'iniciarPjeCalc.bat'), 'start javaw -jar bin\\pjecalc.jar');
  assert.throws(() => conferirInstalacao({ ...configPadrao({}), pasta: semToken }), /Token de serviços/);
});

test('instalação: recusa cópia incompleta ou com portas diferentes', () => {
  const incompleta = copiaFalsa();
  fs.rmSync(path.join(incompleta, '.dados'), { recursive: true });
  assert.throws(() => conferirInstalacao({ ...configPadrao({}), pasta: incompleta }), (e) => e instanceof ErroAdaptador && e.codigo === 'INSTALACAO_INVALIDA');
  const portaOriginal = copiaFalsa('<Server port="9256"><Connector port="9257"/></Server>');
  assert.throws(() => conferirInstalacao({ ...configPadrao({}), pasta: portaOriginal }), /porta 9357/);
});

test('JVM: opções do lançador oficial, sem interface gráfica e com o Tomcat iniciado diretamente', () => {
  const args = argumentosJava([...opcoesDoLancador(BAT_OFICIAL), '-Djava.awt.headless=false']);
  assert.ok(args.includes('-Dseguranca.pjecalc.tokenServicos=TOKEN123'));
  assert.ok(args.includes('-Duser.timezone=GMT-3'));
  assert.ok(args.includes('-Xmx2048m'));
  assert.deepEqual(args.filter((a) => a.startsWith('-Djava.awt.headless')), ['-Djava.awt.headless=true'], 'sem interface gráfica, sempre');
  assert.deepEqual(args.slice(-2), ['org.apache.catalina.startup.Bootstrap', 'start']);
});
