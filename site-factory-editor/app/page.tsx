import { getHomeData } from "@/lib/tally";
import { ClientsBrowser } from "@/components/clients-browser";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [data, { q }] = await Promise.all([getHomeData(), searchParams]);
  // q come prop (niente key/rimontaggio): filtro e ordinamento locali
  // sopravvivono mentre digiti nella ricerca della topbar.
  return <ClientsBrowser initial={data} q={q ?? ""} />;
}
