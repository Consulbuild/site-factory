import { NextResponse } from "next/server";
import { spawnSync } from "node:child_process";
import { CLAUDE_BIN, childEnv } from "@/lib/paths";

export const dynamic = "force-dynamic";

// Stato del login della CLI Claude (login Max): senza sessione attiva NESSUNO
// step AI può partire (run-step la classifica come errore "auth"). Questa
// route rende lo stato visibile PRIMA di lanciare un run, invece che dopo il
// fallimento — l'avviso globale e il pannello Impostazioni leggono da qui.

/** Cache breve in memoria: ogni tab fa polling e spawnare la CLI costa ~1s. */
let cache: { at: number; loggedIn: boolean; authMethod: string } | null = null;
const CACHE_MS = 20_000;

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ loggedIn: cache.loggedIn, authMethod: cache.authMethod });
  }
  const res = spawnSync(CLAUDE_BIN, ["auth", "status"], { env: childEnv(), encoding: "utf8", timeout: 15_000 });
  try {
    // `claude auth status` stampa JSON {loggedIn, authMethod, apiProvider}
    // sia da loggato sia da scaduto: si parsa lo stdout a prescindere dall'exit.
    const parsed = JSON.parse(res.stdout || "");
    cache = { at: Date.now(), loggedIn: parsed.loggedIn === true, authMethod: String(parsed.authMethod ?? "") };
    return NextResponse.json({ loggedIn: cache.loggedIn, authMethod: cache.authMethod });
  } catch {
    return NextResponse.json(
      { error: "stato del login CLI non leggibile", dettaglio: (res.stderr || res.stdout || "").slice(0, 200) },
      { status: 500 },
    );
  }
}

/**
 * Apre il Terminale con `claude login` (macOS, via AppleScript): il flusso
 * OAuth resta interamente nelle mani dell'operatore (suo browser, suo account
 * — l'editor non tocca mai credenziali). Alla prima pressione macOS può
 * chiedere il consenso di automazione per controllare il Terminale.
 */
export async function POST() {
  if (process.platform !== "darwin") {
    return NextResponse.json({ error: "apertura del Terminale supportata solo su macOS" }, { status: 501 });
  }
  // CLAUDE_BIN finisce dentro una stringa AppleScript: niente caratteri che
  // la romperebbero (il path reale ~/.local/bin/claude non ne ha).
  if (/["\\]/.test(CLAUDE_BIN)) {
    return NextResponse.json({ error: "path della CLI non interpolabile in AppleScript" }, { status: 500 });
  }
  const script = `tell application "Terminal"\n\tactivate\n\tdo script "${CLAUDE_BIN} login"\nend tell`;
  const res = spawnSync("/usr/bin/osascript", ["-e", script], { encoding: "utf8", timeout: 15_000 });
  if (res.status !== 0) {
    return NextResponse.json(
      { error: "non riesco ad aprire il Terminale", dettaglio: (res.stderr || "").slice(0, 300) },
      { status: 500 },
    );
  }
  cache = null; // il prossimo GET rilegge lo stato reale post-login
  return NextResponse.json({ ok: true });
}
