"use client";

// «Aggiorna» dell'hub: svuota la cache delle fonti sul server e rifà il render.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnGhost } from "./ui";

export function AggiornaFonti() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={btnGhost}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/portafoglio?aggiorna=1", { cache: "no-store" });
        } finally {
          setBusy(false);
          router.refresh();
        }
      }}
    >
      {busy ? "Aggiorno…" : "Aggiorna"}
    </button>
  );
}
