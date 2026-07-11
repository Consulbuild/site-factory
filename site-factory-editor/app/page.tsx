import { getHomeData } from "@/lib/tally";
import { ClientsBrowser } from "@/components/clients-browser";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [data, { q }] = await Promise.all([getHomeData(), searchParams]);
  // key={q}: al cambio di ricerca dalla topbar il browser clienti si rimonta
  // già filtrato (lo stato della query vive nell'URL, non qui).
  return <ClientsBrowser key={q ?? ""} initial={data} q={q ?? ""} />;
}
