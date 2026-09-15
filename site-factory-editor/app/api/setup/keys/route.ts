import { NextRequest, NextResponse } from "next/server";
import {
  CHIAVI_TRAFFICO,
  KEY_GROUPS,
  KEY_INFO,
  KNOWN_KEYS,
  KEY_LABELS,
  type ChiaveTraffico,
  type KeyName,
  getSecret,
  hasSecret,
  motivoValoreNonSalvabile,
  richiestaDaQuestoMac,
  secretHint,
  setSecret,
} from "@/lib/secrets";
import { normalizzaServiceAccount, provaChiaveTraffico } from "@/lib/chiavi-traffico";
import { umamiLogin, n8nPing, registraCliente } from "@/lib/integrazioni";
import { stripePing } from "@/lib/stripe";
import { gatusPing } from "@/lib/gatus";

export const dynamic = "force-dynamic";

const isChiaveTraffico = (name: KeyName): name is ChiaveTraffico => (CHIAVI_TRAFFICO as readonly string[]).includes(name);

/** 403 se la richiesta non viene dall'editor aperto su questo Mac (vedi richiestaDaQuestoMac). */
function nonLocale(req: NextRequest): NextResponse | null {
  if (richiestaDaQuestoMac(req.headers.get("host"), req.headers.get("origin"))) return null;
  return NextResponse.json({ error: "le chiavi si gestiscono solo dall'editor aperto su questo Mac (localhost)" }, { status: 403 });
}

/** Stato delle key per la UI, per gruppi: MAI il valore, solo presenza + ultimi 4. */
export async function GET(req: NextRequest) {
  const vietata = nonLocale(req);
  if (vietata) return vietata;
  return NextResponse.json({
    gruppi: KEY_GROUPS.map(({ id, titolo, frase, chiavi }) => ({
      id,
      titolo,
      frase,
      chiavi: chiavi.map((name) => ({
        name,
        label: KEY_LABELS[name],
        configured: hasSecret(name),
        hint: secretHint(name),
        ...(isChiaveTraffico(name) ? KEY_INFO[name] : {}),
      })),
    })),
  });
}

/** Prova reale della key prima di salvarla. Ritorna null se ok, il motivo se no. */
async function provaKey(name: KeyName, key: string): Promise<string | null> {
  if (name === "OPENAI_API_KEY") {
    // Gratuita: dimostra che la key è valida, non che l'organizzazione è
    // verificata per gpt-image (quello lo dice il primo run, con l'errore verbatim).
    const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    return r.ok ? null : `OpenAI ha risposto ${r.status}${r.status === 401 ? ": key non valida" : ""}`;
  }
  if (name === "CLOUDFLARE_API_TOKEN") {
    const r = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return r.ok ? null : `Cloudflare ha risposto ${r.status}: token non valido o scaduto`;
  }
  if (name === "CLOUDFLARE_ACCOUNT_ID") {
    if (!/^[0-9a-f]{32}$/i.test(key)) return "formato account ID non valido (32 caratteri esadecimali)";
    const token = getSecret("CLOUDFLARE_API_TOKEN");
    if (!token) return null; // prova combinata solo se il token è già salvato
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${key}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.ok ? null : `account non raggiungibile col token salvato (${r.status})`;
  }
  if (name === "BFL_API_KEY") {
    // BFL non ha un endpoint di verifica gratuito documentato: get_result con id
    // fittizio distingue almeno la key rifiutata (401/403) dagli altri esiti.
    const r = await fetch("https://api.bfl.ai/v1/get_result?id=00000000-0000-0000-0000-000000000000", {
      headers: { "x-key": key },
    });
    if (r.status === 401 || r.status === 403) return "key rifiutata da BFL";
    return null;
  }
  // VPS: prove reali contro i servizi (login Umami, ping del webhook, lista workflow).
  if (name === "UMAMI_PASSWORD") return umamiLogin(key).then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)));
  if (name === "N8N_REGISTRA_KEY") {
    return registraCliente({ slug: "ping", azione: "ping" }, key).then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)));
  }
  if (name === "N8N_API_KEY") return n8nPing(key);
  // Dashboard: lista di 1 abbonamento su Stripe, stati degli endpoint su Gatus.
  if (name === "STRIPE_API_KEY") return stripePing(key);
  if (name === "GATUS_PASSWORD") return gatusPing(key);
  return `nessuna prova definita per ${name}`;
}

/** Valida la key con una chiamata reale, poi la salva nel Keychain macOS e la rilegge. */
export async function POST(req: NextRequest) {
  const vietata = nonLocale(req);
  if (vietata) return vietata;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "") as KeyName;
  let key = String(body.key ?? "").trim();
  if (!(KNOWN_KEYS as readonly string[]).includes(name)) {
    return NextResponse.json({ error: "key sconosciuta" }, { status: 400 });
  }
  if (!key) return NextResponse.json({ error: "key mancante" }, { status: 400 });
  // Credenziale a due metà (DataForSEO): l'altra metà facoltativa, provata e salvata insieme.
  const coppia = isChiaveTraffico(name) ? KEY_INFO[name].coppia : undefined;
  const altra = coppia ? String(body.altra ?? "").trim() : "";
  if (isChiaveTraffico(name)) {
    // Traffico: forma salvata (service account compatto), limiti del Keychain prima
    // della rete, prova gratuita con messaggio già in italiano e senza il valore.
    if (name === "GOOGLE_SERVICE_ACCOUNT") {
      const n = normalizzaServiceAccount(key);
      if (!n.ok) return NextResponse.json({ error: n.errore }, { status: 400 });
      key = n.valore;
    }
    const motivo = motivoValoreNonSalvabile(key);
    if (motivo) return NextResponse.json({ error: motivo }, { status: 400 });
    const motivoAltra = coppia && altra ? motivoValoreNonSalvabile(altra) : null;
    if (coppia && motivoAltra) return NextResponse.json({ error: `${KEY_LABELS[coppia]}: ${motivoAltra}` }, { status: 400 });
    const err = await provaChiaveTraffico(name, key, { fetch: (url, init) => fetch(url, init), getSecret }, altra || undefined);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  } else {
    const err = await provaKey(name, key).catch((e) => (e instanceof Error ? e.message : String(e)));
    if (err) return NextResponse.json({ error: `key non valida: ${err}` }, { status: 400 });
  }
  const scritture: Array<[KeyName, string]> = coppia && altra ? [[name, key], [coppia, altra]] : [[name, key]];
  try {
    for (const [n, v] of scritture) setSecret(n, v);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  // Rilettura: un valore troncato dal Keychain non deve sembrare salvato.
  if (scritture.some(([n, v]) => getSecret(n) !== v)) {
    return NextResponse.json({ error: "salvataggio nel portachiavi incompleto: riprova" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, hint: secretHint(name) });
}
