import { z } from "zod";
import { PRESETS } from "./presets.gen.ts";

/**
 * schema.ts — il CONTRATTO DATI dell'intera Site Factory.
 *
 * L'AI non scrive mai codice: produce un `site.json` valido contro questo schema.
 * Il renderer Astro mappa ogni voce `sections[]` al suo componente e lo riempie con `props`.
 * Lo stesso schema verrà importato dall'editor/pipeline per validare l'output degli agenti.
 *
 * Regola: ogni campo testuale è pensato per essere riempito dall'AI; nessun default "di marca".
 *
 * Titoli (`title`/`headline`): la frase da evidenziare in accent si marca con
 * `**...**` (una sola per titolo). Il renderer la converte in <span class="accent-word">.
 */

/* ------------------------------------------------------------------ */
/* Primitive riutilizzabili                                            */
/* ------------------------------------------------------------------ */

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Colore esadecimale non valido (es. #1e3a5f)");

/* ------------------------------------------------------------------ */
/* Vincoli di copy: la lunghezza è un vincolo di DESIGN                */
/* ------------------------------------------------------------------ */
// Budget tarati sui layout a 390px: un titolo maiuscolo con parole oltre
// ~18 glifi o un campo oltre questi limiti sfonda il layout mobile.
// La pipeline riceve gli stessi limiti via blueprints/*/slots.json: un copy
// fuori misura viene rifiutato QUI, prima della build.
const shortText = (max: number) => z.string().max(max);
const optText = (max: number) => z.string().max(max).default("");

/** Titolo standard: esattamente UNA frase `**accent**`, parole ≤18 glifi.
 *  Il budget si misura sulla lunghezza VISIBILE (senza i marker `**`): è lo
 *  stesso conteggio dell'assembler e dell'editor — il valore resta grezzo
 *  coi marker, che a render li converte renderAccent(). */
const accentTitle = (max: number) =>
  z
    .string()
    .min(1)
    .refine(
      (s) => s.replaceAll("**", "").length <= max,
      `oltre ${max} caratteri visibili (i marker ** non contano nel budget)`,
    )
    // Stessa regola dell'assembler (slots accentMarker): l'accent è la grammatica
    // dello standard, un titolo senza non è un'opzione ma una dimenticanza.
    .refine((s) => {
      const marks = (s.match(/\*\*/g) ?? []).length;
      return marks === 2 && /\*\*[^*]+\*\*/.test(s);
    }, "serve ESATTAMENTE una frase **accent** con marcatori bilanciati")
    .refine(
      (s) => s.replace(/\*\*/g, "").split(/\s+/).every((w) => w.length <= 18),
      "parole oltre 18 caratteri sfondano il layout mobile (390px)",
    );

/** Nomi icona disponibili — tenere allineato a src/components/Icon.astro. */
export const IconNameEnum = z.enum([
  "shield", "clock", "wallet", "leaf", "star", "award", "wrench", "phone",
  "home", "users", "thumbsUp", "ruler", "sparkles", "check", "chevronDown",
  "mail", "mapPin", "message", "instagram", "facebook",
]);
export type IconName = z.infer<typeof IconNameEnum>;

export const ImageSchema = z.object({
  src: z.string().min(1), // URL generato dalla pipeline immagini o path locale
  alt: shortText(140).min(1),
});
export type ImageData = z.infer<typeof ImageSchema>;

export const CtaSchema = z.object({
  label: shortText(34).min(1),
  href: z.string().min(1), // "#contatti", "tel:+39...", "https://..."
  style: z.enum(["primary", "secondary", "ghost"]).default("primary"),
});
export type Cta = z.infer<typeof CtaSchema>;

export const LinkSchema = z.object({
  label: shortText(40).min(1),
  href: z.string().min(1),
});
export type LinkData = z.infer<typeof LinkSchema>;

/* ------------------------------------------------------------------ */
/* Brand / contatti / meta                                            */
/* ------------------------------------------------------------------ */

/**
 * Palette del CLIENTE. Solo primary + accent sono obbligatori (l'identità di
 * marca). I neutri (bg/surface/ink/muted) e secondary sono OPZIONALI: se omessi
 * li possiede lo style-preset (così Nova resta scuro, Canon resta carta, ecc.).
 * I valori forniti vengono iniettati inline e vincono sul preset.
 */
export const PaletteSchema = z.object({
  primary: hexColor, // colore d'azione principale (CTA, struttura)
  accent: hexColor, // pop di marca su highlight/link/eyebrow
  secondary: hexColor.optional(),
  surface: hexColor.optional(),
  bg: hexColor.optional(),
  ink: hexColor.optional(),
  muted: hexColor.optional(),
});
export type Palette = z.infer<typeof PaletteSchema>;

// Derivata dalla libreria generata (presets.gen.ts ← presets/*.tokens.json):
// un preset nuovo pubblicato dalla fabbrica entra nel contratto senza toccare qui.
export const PresetEnum = z.enum(PRESETS);
export type PresetName = z.infer<typeof PresetEnum>;

export const BrandSchema = z.object({
  preset: PresetEnum.default("meridian"), // estetica: minimal/professionale/futuristico/editoriale/artigianale/friendly
  palette: PaletteSchema,
  fonts: z
    .object({
      heading: z.string().min(1).optional(), // override opzionale; di default i font del preset
      body: z.string().min(1).optional(),
      mono: z.string().min(1).optional(),
    })
    .default({}),
  logo: ImageSchema.nullable().default(null),
  // SOLO il simbolo del logo (kit logo-designer): l'Header compone il lockup
  // mark + nome con la tipografia del preset. Ignorato se c'è brand.logo
  // (logo completo fornito dal cliente, che resta la verità).
  mark: ImageSchema.nullable().default(null),
  // path del favicon (di norma il mark del logo ottimizzato per la tab: /media/<slug>/favicon.svg)
  favicon: z.string().min(1).nullable().default(null),
  tone: z.string().default(""), // es. "professionale, rassicurante"
});

export const ContactSchema = z.object({
  phone: z.string().default(""),
  whatsapp: z.string().default(""),
  email: z.string().default(""),
  address: z.string().default(""),
  social: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      tiktok: z.string().optional(),
      linkedin: z.string().optional(),
    })
    .default({}),
});

export const MetaSchema = z.object({
  businessName: z.string().min(1),
  industry: z.string().default(""),
  city: z.string().default(""),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "slug minuscolo, solo lettere/numeri/trattini"),
  seoTitle: optText(70),
  seoDescription: optText(160),
});

/* ------------------------------------------------------------------ */
/* Sezioni — discriminated union su `type`                            */
/* ------------------------------------------------------------------ */

const base = { id: z.string().optional() };

export const HeaderSection = z.object({
  ...base,
  type: z.literal("Header"),
  variant: z.enum(["solid", "transparent"]).default("transparent"),
  props: z.object({
    nav: z.array(LinkSchema).default([]),
    cta: CtaSchema.nullable().default(null),
    showPhone: z.boolean().default(true),
  }),
});

export const HeroSection = z.object({
  ...base,
  type: z.literal("Hero"),
  // D = "big number" (M9): centrato su foto, i badge che iniziano con un
  // numero diventano statistiche grandi — solo se i numeri sono REALI e
  // tracciabili al form (regola niente-invenzioni).
  variant: z.enum(["A", "B", "C", "D"]).default("A"),
  props: z.object({
    eyebrow: optText(48),
    title: accentTitle(52),
    subtitle: optText(180),
    ctas: z.array(CtaSchema).max(2).default([]),
    badges: z.array(shortText(32)).default([]), // es. "Sopralluogo gratuito"
    image: ImageSchema,
  }),
});

export const TrustBarSection = z.object({
  ...base,
  type: z.literal("TrustBar"),
  props: z.object({
    items: z
      .array(z.object({ value: shortText(26).min(1), label: shortText(60).min(1) }))
      .min(2)
      .max(5),
  }),
});

export const ValuePropSection = z.object({
  ...base,
  type: z.literal("ValueProp"),
  variant: z.enum(["A", "B"]).default("A"),
  props: z.object({
    eyebrow: shortText(40).default("Specialisti del settore"),
    title: accentTitle(60),
    intro: optText(160),
    points: z
      .array(z.object({ title: shortText(36).min(1), desc: shortText(140).min(1) }))
      .min(2)
      .max(4),
  }),
});

export const ServicesSection = z.object({
  ...base,
  type: z.literal("Services"),
  variant: z.enum(["grid", "list"]).default("grid"),
  props: z.object({
    eyebrow: shortText(40).default("I nostri servizi"),
    title: accentTitle(60),
    subtitle: optText(160),
    items: z
      .array(
        z.object({
          title: shortText(40).min(1),
          desc: shortText(150).min(1), // elenca i servizi REALI del form coperti dalla card
          bullets: z.array(shortText(36)).max(5).default([]), // checklist con spunta accent
          image: ImageSchema.nullable().default(null),
        }),
      )
      // 3–5 macro-categorie che coprono TUTTI i servizi dichiarati nel form
      // (regola 2026-07-05: il numero di card segue l'offerta reale della PMI)
      .min(3)
      .max(5),
    cta: CtaSchema.nullable().default(null),
  }),
});

export const ProcessStepsSection = z.object({
  ...base,
  type: z.literal("ProcessSteps"),
  variant: z.enum(["cards", "timeline"]).default("cards"),
  props: z.object({
    eyebrow: shortText(40).default("Come funziona"),
    title: accentTitle(60),
    subtitle: optText(160),
    steps: z
      .array(
        z.object({
          title: shortText(36).min(1),
          desc: shortText(140).min(1),
          image: ImageSchema.nullable().default(null),
        }),
      )
      .min(3)
      .max(5),
  }),
});

export const GallerySection = z.object({
  ...base,
  type: z.literal("Gallery"),
  variant: z.enum(["grid", "masonry"]).default("grid"),
  props: z.object({
    eyebrow: shortText(40).default("I nostri lavori"),
    title: accentTitle(60),
    subtitle: optText(160),
    images: z
      .array(
        z.object({
          src: z.string().min(1),
          alt: shortText(140).min(1),
          caption: optText(28), // deve descrivere la foto reale (vedi slots.json)
        }),
      )
      .min(3)
      .max(12),
  }),
});

export const FeatureHighlightSection = z.object({
  ...base,
  type: z.literal("FeatureHighlight"),
  variant: z.enum(["left", "right"]).default("right"),
  props: z.object({
    eyebrow: optText(40),
    title: accentTitle(60),
    body: shortText(400).min(1),
    bullets: z.array(shortText(50)).default([]),
    image: ImageSchema,
    cta: CtaSchema.nullable().default(null),
  }),
});

export const WhyChooseUsSection = z.object({
  ...base,
  type: z.literal("WhyChooseUs"),
  props: z.object({
    eyebrow: shortText(40).default("Perché sceglierci"),
    title: accentTitle(60),
    subtitle: optText(160),
    benefits: z
      .array(
        z.object({
          title: shortText(24).min(1), // pill compatta: titolo brevissimo
          desc: shortText(70).min(1),
          icon: IconNameEnum.default("check"),
        }),
      )
      .min(3)
      .max(6),
  }),
});

export const TestimonialsSection = z.object({
  ...base,
  type: z.literal("Testimonials"),
  props: z.object({
    eyebrow: shortText(40).default("Dicono di noi"),
    title: optText(60),
    items: z
      .array(
        z.object({
          quote: shortText(220).min(1),
          name: shortText(40).min(1),
          city: optText(30),
          role: optText(40),
        }),
      )
      .min(2)
      .max(6),
  }),
});

export const FaqSection = z.object({
  ...base,
  type: z.literal("FAQ"),
  props: z.object({
    eyebrow: shortText(40).default("Hai ancora dubbi?"),
    title: accentTitle(60),
    subtitle: optText(160),
    items: z
      .array(z.object({ q: shortText(90).min(1), a: shortText(420).min(1) }))
      .min(3)
      .max(8),
  }),
});

export const ContactCtaSection = z.object({
  ...base,
  type: z.literal("ContactCTA"),
  // B = "gradual reassurance" (M9): form in 2 passi (prima solo nome+telefono,
  // poi i dettagli facoltativi) — evidenza A/B della ricerca: chiedere poco
  // all'inizio alza le conversioni. Fallback senza JS: tutti i campi visibili.
  variant: z.enum(["A", "B"]).default("A"),
  props: z.object({
    eyebrow: shortText(40).default("Contatti"),
    headline: accentTitle(60),
    subtitle: optText(180),
    showForm: z.boolean().default(true), // true = split col form; false = griglia canali di contatto
    formTitle: shortText(48).default("Richiedi il tuo preventivo gratuito"),
    formNote: optText(120), // micro-copy sotto al form (tempi di risposta ecc.)
    // Informativa art. 13 GDPR: il LINK è obbligatorio; la checkbox di consenso
    // NO (base giuridica art. 6.1.b — risposta a una richiesta dell'interessato).
    privacyHref: z.string().default("/privacy"),
    successHref: z.string().default("/grazie"), // thank-you page dopo l'invio
  }),
});

export const FooterSection = z.object({
  ...base,
  type: z.literal("Footer"),
  props: z.object({
    tagline: optText(180),
    columns: z
      .array(z.object({ title: shortText(30).min(1), links: z.array(LinkSchema) }))
      .default([]),
    legalNote: optText(90), // P.IVA, ragione sociale
  }),
});

/* --- Sezioni nuove (Fase 4): prova, trust, conversione, settore IT --- */

export const ProblemAgitationSection = z.object({
  ...base,
  type: z.literal("ProblemAgitation"),
  variant: z.enum(["list", "split"]).default("list"),
  props: z.object({
    eyebrow: z.string().default(""),
    title: z.string().min(1),
    intro: z.string().default(""),
    points: z
      .array(z.object({ title: shortText(40).min(1), desc: shortText(140).min(1), icon: IconNameEnum.default("check") }))
      .min(2)
      .max(4),
  }),
});

export const AboutSection = z.object({
  ...base,
  type: z.literal("About"),
  variant: z.enum(["left", "right"]).default("left"),
  props: z.object({
    eyebrow: z.string().default(""),
    title: z.string().min(1),
    body: z.string().min(1),
    highlights: z
      .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
      .max(3)
      .default([]),
    image: ImageSchema,
    signature: z.string().default(""), // nome titolare / firma
    cta: CtaSchema.nullable().default(null),
  }),
});

export const LogoBarSection = z.object({
  ...base,
  type: z.literal("LogoBar"),
  variant: z.enum(["grid", "marquee"]).default("grid"),
  props: z.object({
    title: z.string().default(""),
    logos: z.array(ImageSchema).min(3).max(12),
  }),
});

export const CertificationsSection = z.object({
  ...base,
  type: z.literal("Certifications"),
  variant: z.enum(["row", "grid"]).default("grid"),
  props: z.object({
    eyebrow: z.string().default(""),
    title: z.string().min(1),
    subtitle: z.string().default(""),
    items: z
      .array(
        z.object({
          name: z.string().min(1),
          desc: z.string().default(""),
          image: ImageSchema.nullable().default(null),
        }),
      )
      .min(2)
      .max(8),
  }),
});

export const IncentivesSection = z.object({
  ...base,
  type: z.literal("Incentives"),
  props: z.object({
    eyebrow: z.string().default(""),
    title: z.string().min(1),
    subtitle: z.string().default(""),
    items: z
      .array(z.object({ title: z.string().min(1), desc: z.string().min(1), badge: z.string().default("") }))
      .min(2)
      .max(4),
    note: z.string().default(""), // disclaimer "valori indicativi, soggetti a normativa"
  }),
});

export const GuaranteesSection = z.object({
  ...base,
  type: z.literal("Guarantees"),
  props: z.object({
    eyebrow: z.string().default(""),
    title: z.string().min(1),
    subtitle: z.string().default(""),
    items: z
      .array(z.object({ title: shortText(40).min(1), desc: shortText(140).min(1), icon: IconNameEnum.default("check") }))
      .min(2)
      .max(6),
  }),
});

export const BeforeAfterSection = z.object({
  ...base,
  type: z.literal("BeforeAfter"),
  variant: z.enum(["single", "grid"]).default("single"),
  props: z.object({
    eyebrow: z.string().default(""),
    title: z.string().min(1),
    subtitle: z.string().default(""),
    pairs: z
      .array(
        z.object({
          before: ImageSchema,
          after: ImageSchema,
          caption: z.string().default(""),
        }),
      )
      .min(1)
      .max(6),
  }),
});

export const GoogleReviewsSection = z.object({
  ...base,
  type: z.literal("GoogleReviews"),
  variant: z.enum(["badge", "grid"]).default("badge"),
  props: z.object({
    title: z.string().default(""),
    rating: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
    url: z.string().default(""),
    reviews: z
      .array(
        z.object({
          quote: z.string().min(1),
          name: z.string().min(1),
          date: z.string().default(""),
          rating: z.number().min(0).max(5).default(5),
        }),
      )
      .max(6)
      .default([]),
  }),
});

export const CtaBannerSection = z.object({
  ...base,
  type: z.literal("CtaBanner"),
  props: z.object({
    eyebrow: optText(40),
    title: accentTitle(60),
    subtitle: optText(180),
    cta: CtaSchema,
    showPhone: z.boolean().default(true),
    note: optText(90), // rassicurazione sotto le CTA ("Sopralluogo gratuito...")
  }),
});

export const StickyCtaSection = z.object({
  ...base,
  type: z.literal("StickyCta"),
  props: z.object({
    quoteLabel: z.string().default("Preventivo"),
    quoteHref: z.string().default("#contatti"),
    showCall: z.boolean().default(true),
    showWhatsapp: z.boolean().default(true),
  }),
});

export const SectionSchema = z.discriminatedUnion("type", [
  HeaderSection,
  HeroSection,
  TrustBarSection,
  ProblemAgitationSection,
  ValuePropSection,
  ServicesSection,
  ProcessStepsSection,
  FeatureHighlightSection,
  AboutSection,
  LogoBarSection,
  CertificationsSection,
  IncentivesSection,
  GuaranteesSection,
  GallerySection,
  BeforeAfterSection,
  WhyChooseUsSection,
  TestimonialsSection,
  GoogleReviewsSection,
  FaqSection,
  CtaBannerSection,
  ContactCtaSection,
  StickyCtaSection,
  FooterSection,
]);
export type Section = z.infer<typeof SectionSchema>;
export type SectionType = Section["type"];

/* ------------------------------------------------------------------ */
/* Documento radice                                                   */
/* ------------------------------------------------------------------ */

/** Kit di trattamenti di componente (Asse 2): id di variante per componente,
 *  applicati come data-attr su <html> (runtime) e resi dal catalogo trattamenti
 *  in global.css. Additivo/opzionale: assente = kit di default del preset.
 *  I valori li fissa la fabbrica offline (catalogo curato), non l'AI a runtime. */
export const KitSchema = z
  .object({
    navbar: z.string().min(1),
    card: z.string().min(1),
    button: z.string().min(1),
    hero: z.string().min(1),
    sectionHeader: z.string().min(1),
  })
  .partial();
export type Kit = z.infer<typeof KitSchema>;

/* ------------------------------------------------------------------ */
/* Documenti legali reali (Fase 3)                                     */
/* ------------------------------------------------------------------ */

/** Blocchi dei documenti legali (/privacy, /termini): contenuto strutturato,
 *  mai markup. Inline ammessi nel testo: `**grassetto**` e `[testo](url)`,
 *  convertiti da renderLegalInline() in lib/ui.ts. Quando `legal` è presente
 *  le pagine rendono il documento reale SENZA banner anteprima; assente =
 *  contenuti d'esempio col banner (stato pre-Fase 3). */
export const LegalBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("h2"), text: z.string().min(1) }),
  z.object({ type: z.literal("p"), text: z.string().min(1) }),
  z.object({ type: z.literal("ul"), items: z.array(z.string().min(1)).min(1) }),
]);
export type LegalBlock = z.infer<typeof LegalBlockSchema>;

export const LegalDocSchema = z.object({
  intro: z.string().default(""), // lead sotto il titolo (es. "Ai sensi dell'art. 13...")
  updatedAt: z.string().min(1), // "GG/MM/AAAA" — la versione vigente
  blocks: z.array(LegalBlockSchema).min(1),
});
export type LegalDoc = z.infer<typeof LegalDocSchema>;

export const LegalSchema = z.object({
  privacy: LegalDocSchema,
  termini: LegalDocSchema,
  // informativa breve di primo livello sotto il form (rinvia a /privacy)
  formNotice: z.string().min(1),
});

export const SiteConfigSchema = z.object({
  meta: MetaSchema,
  brand: BrandSchema,
  contact: ContactSchema,
  sections: z.array(SectionSchema).min(1),
  kit: KitSchema.optional(),
  legal: LegalSchema.optional(),
});
export type SiteConfig = z.infer<typeof SiteConfigSchema>;

/** Estrae il tipo delle `props` di una sezione dato il suo `type`. */
export type PropsOf<T extends SectionType> = Extract<Section, { type: T }>["props"];

/** Valida e applica i default. Lancia ZodError con messaggi leggibili. */
export function parseSiteConfig(input: unknown): SiteConfig {
  return SiteConfigSchema.parse(input);
}
