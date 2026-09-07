/**
 * Segnaposto per i tipi di domanda non ancora costruiti (foto e logo arrivano in M3):
 * mostra un avviso interno e lascia proseguire, così il percorso resta provabile.
 */
import { OK, h, type ArgomentiComponente, type Componente } from "./base";

export function creaPlaceholder({ domanda }: ArgomentiComponente): Componente {
  const el = h("p", { class: "avviso avviso--attenzione" }, `Componente «${domanda.tipo}» in costruzione (domanda «${domanda.id}»).`);
  return { el, focus: () => {}, leggi: () => undefined, valida: () => OK };
}
