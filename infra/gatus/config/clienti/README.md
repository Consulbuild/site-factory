# Monitor dei siti clienti

Un file `<slug>.yaml` per ogni sito pubblicato con dominio, **generato dall'editor al
deploy** (`site-factory-editor/lib/integrazioni.ts`) e rimosso quando il cliente viene
eliminato. Non modificare a mano: la prossima pubblicazione lo riscriverebbe.

Coolify ricostruisce Gatus a ogni push su `main`; Gatus unisce questi file a
`../base.yaml` (`GATUS_CONFIG_PATH` = cartella).
