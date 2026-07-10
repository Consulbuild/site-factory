import fs from "node:fs";
import path from "node:path";
// Solo import relativi/node CON estensione .ts: questo modulo gira anche via
// `node --experimental-strip-types` fuori da Next (scripts/parity-copy.ts).
import { SITE_RENDERER } from "./paths.ts";
import {
  visibleLen,
  accentOk,
  arrayPrefix,
  ARRAY_BOUNDS,
  BULLETS_MAX,
  type CopySlot,
  type CopyValue,
  type CopyArtifact,
} from "./slots-shared.ts";

// Contratto degli slot copy: legge blueprints/conversione-locale-v1/slots.json
// (+ blueprint.json per le etichette sezione) ed espone il validatore
// deterministico SPECCHIO dell'assembler (assemble-site.ts) più i bound di
// conteggio che il renderer impone via Zod (src/lib/schema.ts) al gate finale.
// Un artifact che passa qui non può fallire là per motivi di formato.
// Gli helper puri (conteggio, accent, bound) vivono in slots-shared.ts,
// client-safe: la UI usa le STESSE definizioni.

export { visibleLen, accentOk, ARRAY_BOUNDS, BULLETS_MAX };
export type { CopySlot, CopyValue, CopyArtifact };

const BLUEPRINT_DIR = path.join(SITE_RENDERER, "blueprints", "conversione-locale-v1");

/** Etichette operative per l'indice di sezione del blueprint. */
const SECTION_LABELS: Record<string, string> = {
  Hero: "Hero",
  TrustBar: "Trust bar",
  Services: "Servizi",
  Gallery: "Galleria",
  ProcessSteps: "Processo",
  FAQ: "Domande frequenti",
  CtaBanner: "CTA banner",
  Footer: "Footer",
};

interface RawSlot {
  path: string;
  agent: string;
  constraints?: { maxChars?: number; accentMarker?: boolean };
  note?: string;
}

let cache: CopySlot[] | null = null;

/** Gli slot dell'agente copy, con etichette sezione dal blueprint. */
export function copySlots(): CopySlot[] {
  if (cache) return cache;
  const slotsFile = JSON.parse(fs.readFileSync(path.join(BLUEPRINT_DIR, "slots.json"), "utf8")) as {
    slots: RawSlot[];
  };
  const blueprint = JSON.parse(fs.readFileSync(path.join(BLUEPRINT_DIR, "blueprint.json"), "utf8")) as {
    sections: Array<{ type: string }>;
  };
  cache = slotsFile.slots
    .filter((s) => s.agent === "copy")
    .map((s) => {
      const m = s.path.match(/^sections\[(\d+)\]/);
      const idx = m ? Number(m[1]) : null;
      const type = idx !== null ? blueprint.sections[idx]?.type : null;
      let label = idx !== null ? (SECTION_LABELS[type ?? ""] ?? type ?? `Sezione ${idx}`) : "SEO (meta)";
      // Due ContactCTA nel blueprint: distinguerle per ruolo.
      if (type === "ContactCTA") label = idx === 6 ? "Form preventivo" : "Contatti e canali";
      return {
        path: s.path,
        maxChars: s.constraints?.maxChars,
        accentMarker: s.constraints?.accentMarker,
        guida: s.note ?? "",
        sectionIndex: idx,
        sectionLabel: label,
        wildcardDepth: (s.path.split("[*]").length - 1) as 0 | 1 | 2,
      };
    });
  return cache;
}

/**
 * Validatore deterministico del copy artifact, specchio dell'assembler
 * (ownership, forma, maxChars senza `**`, accent esattamente-uno, coerenza
 * lunghezze tra sibling) + i bound Zod del renderer (conteggi array, parole
 * ≤18 glifi nei titoli accent) + completezza 32/32 (uno slot mancante al
 * build = testo del golden example che finisce sul sito del cliente).
 * Ritorna la lista dei problemi (vuota = conforme).
 */
export function validateCopyArtifact(map: Record<string, unknown>): string[] {
  const errs: string[] = [];
  const slots = copySlots();
  const byPath = new Map(slots.map((s) => [s.path, s]));

  // ① ownership: chiavi ⊆ slot copy
  for (const key of Object.keys(map)) {
    if (!byPath.has(key)) errs.push(`«${key}»: path fuori dagli slot copy dichiarati`);
  }
  // ② completezza
  for (const s of slots) {
    if (!(s.path in map)) errs.push(`«${s.path}»: slot mancante (al build resterebbe il testo d'esempio)`);
  }

  const arrayLen = new Map<string, { len: number; by: string }>();

  for (const s of slots) {
    const v = map[s.path];
    if (v === undefined) continue;

    // ③ forma del valore per profondità wildcard
    const leaves: string[] = [];
    if (s.wildcardDepth === 0) {
      if (typeof v !== "string") {
        errs.push(`«${s.path}»: atteso una stringa`);
        continue;
      }
      leaves.push(v);
    } else if (s.wildcardDepth === 1) {
      if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
        errs.push(`«${s.path}»: atteso un array di stringhe`);
        continue;
      }
      leaves.push(...(v as string[]));
    } else {
      if (!Array.isArray(v) || v.some((x) => !Array.isArray(x) || x.some((y) => typeof y !== "string"))) {
        errs.push(`«${s.path}»: atteso un array di array di stringhe (uno per card)`);
        continue;
      }
      for (const sub of v as string[][]) leaves.push(...sub);
    }

    // ④ coerenza lunghezze tra sibling sullo stesso array (primo scrittore fissa)
    if (s.wildcardDepth >= 1) {
      const prefix = arrayPrefix(s.path);
      const len = (v as unknown[]).length;
      const prev = arrayLen.get(prefix);
      if (prev && prev.len !== len) {
        errs.push(`«${s.path}»: lunghezza array ${len} in conflitto con ${prev.len} imposta da «${prev.by}»`);
      } else if (!prev) {
        arrayLen.set(prefix, { len, by: s.path });
        // bound Zod sul conteggio
        const bound = ARRAY_BOUNDS[prefix];
        if (bound && (len < bound.min || len > bound.max)) {
          errs.push(`«${prefix}»: ${len} ${bound.label} — il renderer ne richiede tra ${bound.min} e ${bound.max}`);
        }
      }
      if (s.wildcardDepth === 2) {
        for (const [i, sub] of (v as string[][]).entries()) {
          if (sub.length > BULLETS_MAX) errs.push(`«${s.path}» card ${i + 1}: ${sub.length} bullets — massimo ${BULLETS_MAX}`);
        }
      }
    }

    // ⑤⑥⑧ per ogni foglia: budget, accent, parole lunghe
    for (const leaf of leaves) {
      if (s.maxChars !== undefined && visibleLen(leaf) > s.maxChars) {
        errs.push(`«${s.path}»: ${visibleLen(leaf)} caratteri > ${s.maxChars} — «${leaf.slice(0, 50)}…»`);
      }
      const markers = (leaf.match(/\*\*/g) ?? []).length;
      if (s.accentMarker) {
        if (!accentOk(leaf)) {
          errs.push(`«${s.path}»: serve esattamente UNA frase **accent** («${leaf.slice(0, 50)}»)`);
        }
        // parole ≤18 glifi (gate Zod del renderer sui titoli, tarato sui 390px)
        const lunga = leaf
          .replaceAll("**", "")
          .split(/\s+/)
          .find((w) => w.length > 18);
        if (lunga) errs.push(`«${s.path}»: parola oltre 18 caratteri («${lunga}») sfonda il layout mobile`);
      } else if (markers > 0) {
        errs.push(`«${s.path}»: marker **accent** non ammesso in questo slot`);
      }
    }
  }
  return errs;
}
