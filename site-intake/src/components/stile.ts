/**
 * Stile del sito: sei card con una mini-anteprima disegnata (SVG), massimo due.
 * Le anteprime sono illustrazioni: i loro colori sono contenuto, non token della UI.
 */
import { opzioniDi } from "../data/domande";
import { OK, blocco, h, svgIcona, type ArgomentiComponente, type Componente } from "./base";

const ANTEPRIME: Record<string, string> = {
  pulito:
    '<rect width="120" height="90" fill="#ffffff"/><rect x="14" y="14" width="40" height="6" rx="3" fill="#0f172a"/><rect x="14" y="26" width="64" height="3" rx="1.5" fill="#cbd5e1"/><rect x="14" y="33" width="52" height="3" rx="1.5" fill="#cbd5e1"/><rect x="14" y="48" width="28" height="10" rx="5" fill="#0f172a"/><rect x="14" y="68" width="92" height="1" fill="#e2e8f0"/>',
  allegro:
    '<rect width="120" height="90" fill="#fff7ed"/><rect x="12" y="12" width="44" height="30" rx="8" fill="#fb923c"/><rect x="62" y="12" width="46" height="30" rx="8" fill="#22c55e"/><rect x="12" y="48" width="96" height="30" rx="8" fill="#38bdf8"/><circle cx="34" cy="27" r="6" fill="#fff"/>',
  elegante:
    '<rect width="120" height="90" fill="#111827"/><text x="14" y="40" font-family="Georgia, serif" font-size="22" fill="#f8fafc">Aa</text><rect x="14" y="50" width="60" height="1" fill="#c9a227"/><rect x="14" y="60" width="44" height="3" rx="1.5" fill="#94a3b8"/><rect x="14" y="67" width="36" height="3" rx="1.5" fill="#94a3b8"/>',
  tecnico:
    '<rect width="120" height="90" fill="#f1f5f9"/><path d="M0 22h120M0 44h120M0 66h120M30 0v90M60 0v90M90 0v90" stroke="#cbd5e1" stroke-width="1"/><rect x="14" y="14" width="48" height="8" rx="2" fill="#1d4ed8"/><rect x="14" y="30" width="72" height="4" rx="2" fill="#0f172a"/><rect x="14" y="52" width="30" height="20" rx="3" fill="#1d4ed8"/><rect x="50" y="52" width="30" height="20" rx="3" fill="#94a3b8"/>',
  caldo:
    '<rect width="120" height="90" fill="#f5ebdd"/><rect x="14" y="14" width="50" height="34" rx="14" fill="#b45309"/><rect x="70" y="14" width="36" height="34" rx="14" fill="#d6a06b"/><rect x="14" y="56" width="92" height="6" rx="3" fill="#7c2d12"/><rect x="14" y="68" width="60" height="4" rx="2" fill="#a16207"/>',
  deciso:
    '<rect width="120" height="90" fill="#0a0a0a"/><rect x="12" y="14" width="70" height="14" fill="#ffffff"/><rect x="12" y="32" width="46" height="14" fill="#ffffff"/><rect x="12" y="58" width="34" height="12" fill="#ef4444"/><rect x="88" y="14" width="20" height="56" fill="#ffffff"/>',
};

export function creaStile({ domanda, risposte, valore }: ArgomentiComponente<string[]>): Componente<string[]> {
  const opzioni = opzioniDi(domanda, risposte);
  const max = domanda.max ?? 2;
  const scelti = new Set(valore ?? []);
  const nota = h("p", { class: "campo__aiuto", "aria-live": "polite" });
  const griglia = h(
    "div",
    { class: "scelte scelte--riquadri scelte--stili", role: "group", "aria-labelledby": "domanda" },
    ...opzioni.map((o) =>
      h(
        "label",
        { class: "scelta scelta--stile" },
        h("input", { class: "scelta__input", type: "checkbox", name: "stile", value: o.id, checked: scelti.has(o.id) }),
        h("span", { class: "stile__anteprima", "aria-hidden": "true", html: `<svg viewBox="0 0 120 90" role="img">${ANTEPRIME[o.id] ?? ""}</svg>` }),
        h("span", { class: "scelta__testo" }, o.testo),
        h("span", { class: "scelta__spunta", "aria-hidden": "true" }, svgIcona("spunta")),
      ),
    ),
  );
  griglia.addEventListener("change", (e) => {
    const inp = e.target as HTMLInputElement;
    const n = griglia.querySelectorAll(".scelta__input:checked").length;
    if (inp.checked && n > max) {
      inp.checked = false;
      nota.textContent = `Massimo ${max}: togline uno per sceglierne un altro.`;
    } else nota.textContent = "";
  });
  const el = h("div", { class: "campo-gruppo" }, griglia, nota);
  const ids = () => [...griglia.querySelectorAll<HTMLInputElement>(".scelta__input:checked")].map((i) => i.value);
  return {
    el,
    focus: () => griglia.querySelector<HTMLInputElement>(".scelta__input")?.focus(),
    leggi: () => (ids().length ? ids() : undefined),
    valida: () => (ids().length ? OK : blocco("Tocca uno stile per andare avanti.")),
  };
}
