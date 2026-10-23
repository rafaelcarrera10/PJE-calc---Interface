# ESQUELETO — Fase 1 (não testado). Ver README.md.
FROM eclipse-temurin:8-jre-jammy

ARG PJECALC_URL
ARG PJECALC_SHA256

RUN apt-get update && apt-get install -y --no-install-recommends \
      p7zip-full curl ca-certificates fontconfig fonts-dejavu fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home --uid 10001 pjecalc
WORKDIR /opt/pjecalc

# 1) Baixa o instalador OFICIAL e confere a integridade
RUN test -n "$PJECALC_URL" && test -n "$PJECALC_SHA256" \
    && curl -fsSL -o /tmp/instalador "$PJECALC_URL" \
    && echo "$PJECALC_SHA256  /tmp/instalador" | sha256sum -c - \
    && 7z x -y -o/tmp/extraido /tmp/instalador >/dev/null \
    && APP_DIR="$(dirname "$(find /tmp/extraido -type f -path '*bin/pjecalc.jar' | head -1)")/.." \
    && cp -a "$APP_DIR"/. /opt/pjecalc/ \
    && rm -rf /opt/pjecalc/bin/jre /tmp/instalador /tmp/extraido

# 2) Somente configuração de ambiente: HTTP em 127.0.0.1:9257, sem AJP
COPY server.xml /opt/pjecalc/tomcat/conf/server.xml
COPY iniciar.sh /opt/pjecalc/iniciar.sh

RUN chmod +x /opt/pjecalc/iniciar.sh \
    && mkdir -p /opt/pjecalc/tomcat/temp /opt/pjecalc/tomcat/work /opt/pjecalc/tomcat/logs \
    && chown -R pjecalc:pjecalc /opt/pjecalc

USER pjecalc
ENV JAVA_OPTS="-Djava.awt.headless=true -Duser.timezone=GMT-3 -Dfile.encoding=ISO-8859-1 -Xms1024m -Xmx2048m"

HEALTHCHECK --interval=15s --timeout=10s --start-period=180s --retries=5 \
  CMD curl -fsS http://127.0.0.1:9257/pjecalc/pages/principal.jsf >/dev/null || exit 1

ENTRYPOINT ["/opt/pjecalc/iniciar.sh"]
