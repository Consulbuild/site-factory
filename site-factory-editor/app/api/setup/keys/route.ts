import { NextRequest, NextResponse } from "next/server";
import { KNOWN_KEYS, KEY_LABELS, type KeyName, getSecret, hasSecret, secretHint, setSecret } from "@/lib/secrets";
import { listSubmissions } from "@/lib/tally";

export const dynamic = "force-dynamic";

/** Stato delle key per la UI: MAI il valore, solo presenza + ultimi 4. */
export async function GET() {
  return NextResponse.json(
    KNOWN_KEYS.map((name) => ({
      name,
      label: KEY_LABELS[name],
      configured: hasSecret(name),
      hint: secretHint(name),
    })),
  );
}

/** Prova reale della key prima di salvarla. Ritorna null se ok, il motivo se no. */
async function provaKey(name: KeyName, key: string): Promise<string | null> {
  if (name === "TALLY_API_KEY") {
    try {
      await listSubmissions(key);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }
  if (name === "RECRAFT_API_KEY") {
    const r = await fetch("https://external.api.recraft.ai/v1/users/me", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return r.ok ? null : `Recraft ha risposto ${r.status}`;
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
  return `nessuna prova definita per ${name}`;
}

/** Valida la key con una chiamata reale, poi la salva nel Keychain macOS. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "") as KeyName;
  const key = String(body.key ?? "").trim();
  if (!(KNOWN_KEYS as readonly string[]).includes(name)) {
    return NextResponse.json({ error: "key sconosciuta" }, { status: 400 });
  }
  if (!key) return NextResponse.json({ error: "key mancante" }, { status: 400 });
  const err = await provaKey(name, key).catch((e) => (e instanceof Error ? e.message : String(e)));
  if (err) return NextResponse.json({ error: `key non valida: ${err}` }, { status: 400 });
  try {
    setSecret(name, key);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  return NextResponse.json({ ok: true, hint: secretHint(name) });
}
