import { listReferences } from "@/lib/factory/state";
import { RiferimentiBrowser } from "@/components/fabbrica/riferimenti-browser";

export const dynamic = "force-dynamic";

// Registro dei riferimenti della fabbrica: aggiunta con verifica opt-out TDM
// streaming, esiti legali sempre visibili (il log è la prova di diligenza).
export default async function RiferimentiPage() {
  const references = listReferences();
  return <RiferimentiBrowser references={references} />;
}
