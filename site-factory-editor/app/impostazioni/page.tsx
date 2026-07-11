import { ApiKeysPanel } from "@/components/home";

export const dynamic = "force-dynamic";

export default function Impostazioni() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Impostazioni</h1>
        <p className="mt-1 text-sm text-muted">Chiavi API e configurazione della pipeline.</p>
      </div>
      <ApiKeysPanel aperto />
    </div>
  );
}
