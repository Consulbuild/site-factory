import { ApiKeysPanel } from "@/components/home";
import { ClaudeAuthPanel } from "@/components/claude-auth";
import { CollegamentiStripe } from "@/components/collegamenti-stripe";
import { listClients } from "@/lib/clients";

export const dynamic = "force-dynamic";

export default function Impostazioni() {
  const clienti = listClients().map(({ slug, businessName, citta }) => ({ slug, businessName, citta }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Impostazioni</h1>
        <p className="mt-1 text-sm text-muted">Login Claude, chiavi API e configurazione della pipeline.</p>
      </div>
      <ClaudeAuthPanel />
      <ApiKeysPanel aperto />
      <CollegamentiStripe clienti={clienti} />
    </div>
  );
}
