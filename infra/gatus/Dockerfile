# Monitor dei siti e dei servizi (Gatus), ridistribuito da Coolify a ogni push
# su main (GitHub App → Build Pack Dockerfile, Base Directory /infra/gatus).
# La configurazione viaggia DENTRO l'immagine: nessun bind mount, nessuna
# dipendenza da opzioni del pannello. GATUS_CONFIG_PATH = cartella → Gatus
# unisce base.yaml e i file per-cliente in clienti/ (gli endpoint si sommano).
# Cartella NOSTRA, non /config: l'immagine porta un /config/config.yaml di
# esempio (twin.sh, example.org, DNS) che altrimenti si somma ai nostri endpoint
# (visto sul monitor il 2026-09-05; l'immagine è scratch, niente rm).
FROM twinproduction/gatus:stable
COPY config /gatus-config
ENV GATUS_CONFIG_PATH=/gatus-config
