# VPS Hetzner CX33 — guida di setup (Site-factory / ConsulBuild)

Data: 2026-09-03. Fonti verificate: docs Hetzner Cloud (creazione server, FAQ, firewall,
backup), docs Coolify (installazione, firewall, servizi), docs Bitwarden (SSH agent).
Decisioni di contesto: sessione 2026-08-04 «VPS hardware adequacy» + docs/agents-skills-plan.md
+ docs/decisions/2026-07-verifiche-fase-b.md.

## 0. Cosa gira sul VPS (e cosa NO)

Sul VPS girano solo i servizi h24 che servono i siti pubblicati dei clienti:

| Servizio | A cosa serve | Come si installa |
|---|---|---|
| **Coolify** | pannello web che gestisce tutto il resto (Docker, SSL, backup) | script ufficiale |
| **n8n** | automazioni: riceve il form dei siti, webhook Tally, notifiche email | one-click da Coolify |
| **Umami** | analytics dei siti clienti, senza cookie (niente banner) | one-click da Coolify |

NON gira sul VPS: la pipeline AI (`claude -p` sul Mac), l'editor Next.js (locale), i siti
dei clienti (Cloudflare Workers). Il CX33 (4 vCPU / 8 GB) è sovradimensionato: consumo
atteso ~2–2,5 GB di RAM.

## 1. Nomenclatura decisa (da usare identica ovunque)

| Cosa | Valore |
|---|---|
| Progetto Hetzner | `Site Factory VPS` (già creato) |
| Nome server / hostname | `sf-prod-01` |
| Firewall Hetzner | `fw-sf-prod` (rinomina `firewall-1`) |
| Chiave SSH in Bitwarden | `SSH sf-prod-01 (Hetzner)` |
| Utente di accesso al VPS | `root` (login SOLO con chiave, password disabilitata) |
| Sottodomini (DNS Cloudflare, record A → IPv4 del VPS) | `coolify.consulbuild.com`, `n8n.consulbuild.com`, `stats.consulbuild.com` |
| Fuso orario server | `Europe/Rome` |

Perché `root` e non un secondo utente: Coolify gestisce il server via SSH come root con
la chiave; un utente in più aggiunge passaggi senza aumentare la sicurezza reale, perché
la porta 22 è comunque aperta solo ai tuoi IP dal firewall Hetzner e senza password.

## 2. Prima di creare il server: la chiave SSH in Bitwarden

La chiave SSH sostituisce la password: il pezzo «pubblico» va su Hetzner, il pezzo
«privato» resta in Bitwarden e non lo vedrai mai né dovrai copiarlo da nessuna parte.

1. Apri **Bitwarden desktop** (app Mac, non l'estensione) → **Impostazioni** → attiva
   **Abilita agente SSH** (Enable SSH agent).
2. Nel vault: **Nuovo elemento → tipo «Chiave SSH»**, nome `SSH sf-prod-01 (Hetzner)`.
   Bitwarden genera la coppia da solo. Salva.
3. Apri l'elemento e **copia la chiave pubblica** (inizia con `ssh-ed25519 …`): ti serve
   al passo 3.4.
4. Nel Terminale del Mac, una volta sola, per dire al terminale di usare Bitwarden:

```bash
echo 'export SSH_AUTH_SOCK=$HOME/.bitwarden-ssh-agent.sock' >> ~/.zshrc && source ~/.zshrc
```

Da ora ogni `ssh` chiede conferma nella finestra di Bitwarden (vault sbloccato) e
entra. Bitwarden deve essere aperto quando ti colleghi.

## 3. Creazione del server nella Console Hetzner

Nella schermata «Create a server» (correzioni rispetto allo screenshot attuale):

1. **Location**: Falkenstein (ok, dati in UE).
2. **Type**: Shared → Cost-Optimized → seleziona la riga **CX33** (nello screenshot è
   evidenziata la CX23: sbagliata).
3. **Image**: Ubuntu → nel menu a tendina scegli **24.04** (non 26.04: lo script
   ufficiale di Coolify dichiara supporto per 20.04/22.04/24.04 LTS; 24.04 è supportata
   fino al 2029).
4. **SSH keys**: «Add SSH key» → incolla la chiave pubblica copiata da Bitwarden, nome
   `mattia-bitwarden`. Senza chiave Hetzner manda la password root via email e Ubuntu
   ha comunque il login con password disabilitato: la chiave è l'unica strada.
   **Non si può aggiungere dopo dalla Console**: fallo ora.
5. **Networking**: Public IPv4 + IPv6 attivi (ok). Nessuna rete privata.
6. **Firewalls**: seleziona `firewall-1` (lo sistemi al passo 4).
7. **Backups**: **attiva** (circa +20% del prezzo; 7 copie giornaliere a rotazione).
   Workflow n8n e dati Umami vivranno solo qui.
8. Volumes, Placement groups, Labels, Cloud config: lascia vuoti.
9. **Name**: `sf-prod-01`.
10. Create & Buy now. Appena pronto, **annota l'IPv4** (vedi §8).

## 4. Firewall Hetzner (regole definitive)

Hetzner blocca tutto in entrata salvo le regole; l'uscita è sempre permessa. Vale più
di un firewall dentro Ubuntu, perché Docker (usato da Coolify) aggira `ufw`: la docs di
Coolify consiglia esplicitamente il firewall del provider.

Rinomina in `fw-sf-prod` e imposta INBOUND così:

| # | Descrizione | Sorgente | Protocollo | Porta |
|---|---|---|---|---|
| 1 | SSH solo da me | i tuoi IP (già inseriti) | TCP | 22 |
| 2 | ping | Any IPv4, Any IPv6 | ICMP | – |
| 3 | HTTP (certificati SSL) | Any IPv4, Any IPv6 | TCP | 80 |
| 4 | HTTPS (siti/servizi) | Any IPv4, Any IPv6 | TCP | 443 |
| 5 | Coolify pannello (TEMPORANEA) | i tuoi IP | TCP | 8000 |
| 6 | Coolify realtime (TEMPORANEA) | i tuoi IP | TCP | 6001-6002 |

OUTBOUND: nessuna regola (tutto permesso).

Attenzione, unico punto scomodo: i due IP inseriti sembrano di connessioni italiane
domestiche/mobili e **possono cambiare**. Se un giorno `ssh` non risponde, apri la
Console → Firewalls → regola 1 → sostituisci l'IP con quello attuale (lo trovi cercando
«il mio IP» su Google). Non serve altro.

## 5. Primo accesso e preparazione di Ubuntu (5 minuti)

Dal Terminale del Mac (Bitwarden aperto; `IP` = l'IPv4 del server):

```bash
ssh root@IP
```

Alla prima volta risponde «fingerprint… continue?»: scrivi `yes`. Poi, dentro il server:

```bash
apt update && apt upgrade -y
```

```bash
hostnamectl set-hostname sf-prod-01
```

```bash
timedatectl set-timezone Europe/Rome
```

```bash
reboot
```

Ubuntu 24.04 installa da solo gli aggiornamenti di sicurezza (`unattended-upgrades` è
attivo di default): non c'è da configurare altro.

## 6. Installare Coolify

Riconnettiti (`ssh root@IP`) e lancia lo script ufficiale (installa anche Docker):

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Ci mette qualche minuto. Alla fine stampa un indirizzo `http://IP:8000`.

**SUBITO** (la docs avverte: chi apre quella pagina per primo diventa amministratore):

1. Apri `http://IP:8000` nel browser → pagina di registrazione.
2. Crea l'admin: email `info@consulbuild.com`, password generata da Bitwarden.
   Salva in Bitwarden come login `Coolify sf-prod-01` (URL `http://IP:8000`, poi
   aggiorna a `https://coolify.consulbuild.com`).
3. In Coolify → Settings → imposta **Instance domain** = `https://coolify.consulbuild.com`
   (prima crea su Cloudflare il record A `coolify` → IP, proxy DISATTIVATO, nuvola grigia).
   Coolify ottiene il certificato SSL da solo.
4. Quando `https://coolify.consulbuild.com` funziona: torna nel firewall Hetzner e
   **cancella le regole 5 e 6** (8000 e 6001-6002). Da ora il pannello è raggiungibile
   solo in HTTPS sul dominio.

## 7. Servizi (seconda sessione, dopo che il pannello è raggiungibile)

In Coolify → Project → + New Resource → **Services**: `n8n` e `Umami` sono nel catalogo
one-click (Coolify crea da solo i loro database Postgres). Per ciascuno: assegna il
dominio (`n8n.consulbuild.com`, `stats.consulbuild.com`, record A su Cloudflare) e
Deploy. Dettagli di configurazione (utente admin n8n, email transazionale via
provider esterno e non dall'IP del VPS, script Umami in `Base.astro`) nella prossima
guida: fuori scope di questa.

## 8. Scheda da salvare in Bitwarden (nota sicura `VPS sf-prod-01`)

Compila mentre fai il setup. È esattamente quello che ti è mancato l'ultima volta.

```
VPS sf-prod-01 — Hetzner Cloud, progetto "Site Factory VPS"
Piano: CX33 (4 vCPU, 8 GB RAM, 80 GB SSD) — Falkenstein — Ubuntu 24.04 LTS
IPv4: ______________________
IPv6: ______________________
Utente SSH: root  (password: NESSUNA, solo chiave)
Chiave SSH: elemento Bitwarden "SSH sf-prod-01 (Hetzner)" — nome su Hetzner "mattia-bitwarden"
Comando accesso: ssh root@IPv4   (Bitwarden desktop aperto)
Firewall Hetzner: fw-sf-prod (SSH 22 solo dai miei IP: ______ / ______)
Backup Hetzner: attivi (giornalieri, 7 copie)
Coolify: https://coolify.consulbuild.com — login = elemento Bitwarden "Coolify sf-prod-01"
n8n: https://n8n.consulbuild.com — login = elemento Bitwarden "n8n sf-prod-01"
Umami: https://stats.consulbuild.com — login = elemento Bitwarden "Umami sf-prod-01"
Data creazione: ____________
```

Se perdi l'accesso SSH per qualsiasi motivo: Console Hetzner → server → **Rescue → Reset
Root Password** ti dà una password temporanea (e la Console ha una finestra terminale
integrata che non passa dal firewall).
