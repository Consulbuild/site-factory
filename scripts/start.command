#!/bin/bash
# Site-factory — avvia editor (Next :3311) + renderer (Astro :4321) con log
# intrecciati in un'unica finestra. Ctrl-C ferma entrambi i server puliti.
# Node sta in ~/.local (niente Homebrew), quindi il PATH va esteso qui.
export PATH="$HOME/.local/bin:$PATH"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

printf '\033[1m▶ Site-factory\033[0m — Ctrl-C per fermare tutto.\n'
printf '  Gli step AI (claude -p) richiedono un "claude login" attivo (piano Max).\n\n'

# ponytail: kill 0 nuke l'intero process group a fine sessione. Un eventuale
# worker figlio di next che si stacca dal gruppo resterebbe orfano (raro,
# visibile nei log) — per un launcher locale è un tetto accettabile.
trap 'printf "\n\033[1m■ Arresto server…\033[0m\n"; kill 0' EXIT

# idempotente: se la porta è già in ascolto non riavvio (evita "port in use")
port_busy() { lsof -iTCP:"$1" -sTCP:LISTEN -n >/dev/null 2>&1; }

if port_busy 3311; then printf '  \033[2m[editor] già attivo su :3311 — non riavvio\033[0m\n'
else ( cd "$REPO/site-factory-editor" && PORT=3311 npm run dev 2>&1 | sed -l $'s/^/\033[36m[editor]\033[0m /' ) & fi

if port_busy 4321; then printf '  \033[2m[render] già attivo su :4321 — non riavvio\033[0m\n'
else ( cd "$REPO/site-renderer" && npm run dev 2>&1 | sed -l $'s/^/\033[35m[render]\033[0m /' ) & fi

# apri il browser appena l'editor risponde (max ~90s), senza bloccare i log
( for _ in $(seq 1 90); do
    curl -sf -o /dev/null http://127.0.0.1:3311 && { open http://localhost:3311 http://localhost:4321; break; }
    sleep 1
  done ) &

wait
