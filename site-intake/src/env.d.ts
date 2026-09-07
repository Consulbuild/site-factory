/// <reference types="astro/client" />

// Variabili pubbliche lette alla build (vedi README «Trasporto» e «Deploy»).
interface ImportMetaEnv {
  /** Base delle route del trasporto (prod: webhook n8n). In dev, se assente, "/api". */
  readonly PUBLIC_INTAKE_URL?: string;
  readonly PUBLIC_UMAMI_HOST?: string;
  readonly PUBLIC_UMAMI_WEBSITE_ID?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
