#!/bin/sh
# ESQUELETO — inicia o Tomcat embarcado do PJe-Calc direto, sem o lançador Swing.
set -eu
cd /opt/pjecalc
CP="tomcat/bin/bootstrap.jar:tomcat/bin/tomcat-juli.jar"
# Caso a distribuição não traga tomcat/bin, usar os jars de bin/lib (a validar na Fase 1):
[ -f tomcat/bin/bootstrap.jar ] || CP="$(ls bin/lib/*.jar | tr '\n' ':')"
TOKEN="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"   # token dos serviços REST, efêmero por instância
exec java $JAVA_OPTS \
  -Dseguranca.pjecalc.tokenServicos="$TOKEN" \
  -Dcatalina.home=/opt/pjecalc/tomcat -Dcatalina.base=/opt/pjecalc/tomcat \
  -cp "$CP" org.apache.catalina.startup.Bootstrap start
