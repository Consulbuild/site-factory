/** Pagine social: tre caselle facoltative; nome pagina, @nome o link intero, sistemati in lettura. */
import { normalizzaSocial } from "../lib/validators";
import { OK, campoTesto, h, type ArgomentiComponente, type Componente } from "./base";

interface ValoreSocial {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

export function creaSocial({ valore }: ArgomentiComponente<ValoreSocial>): Componente<ValoreSocial> {
  const campi = (["facebook", "instagram", "tiktok"] as const).map((k) =>
    [
      k,
      campoTesto({
        etichetta: k === "facebook" ? "Facebook" : k === "instagram" ? "Instagram" : "TikTok",
        facoltativo: true,
        placeholder: "nome pagina o link",
        autocomplete: "off",
        valore: valore?.[k] ?? "",
        nome: `social_${k}`,
        maxlength: 200,
      }),
    ] as const,
  );
  for (const [, c] of campi) c.input.setAttribute("autocapitalize", "off");
  const el = h("div", { class: "campo-gruppo" }, ...campi.map(([, c]) => c.el));
  return {
    el,
    focus: () => campi[0]?.[1].input.focus(),
    leggi: () => {
      const out: ValoreSocial = {};
      for (const [k, c] of campi) {
        const v = normalizzaSocial(k, c.input.value);
        if (v) out[k] = v;
      }
      return Object.keys(out).length ? out : undefined;
    },
    valida: () => OK,
  };
}
