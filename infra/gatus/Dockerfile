# Monitor dei siti e dei servizi (Gatus), ridistribuito da Coolify a ogni push
# su main (GitHub App → Build Pack Dockerfile, Base Directory /infra/gatus).
# La configurazione viaggia DENTRO l'immagine: nessun bind mount, nessuna
# dipendenza da opzioni del pannello. GATUS_CONFIG_PATH = cartella → Gatus
# unisce base.yaml e i file per-cliente in clienti/ (gli endpoint si sommano).
FROM twinproduction/gatus:stable
COPY config /config
ENV GATUS_CONFIG_PATH=/config
