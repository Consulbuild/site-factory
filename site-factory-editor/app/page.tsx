import { getHomeData } from "@/lib/tally";
import { ClientsBrowser } from "@/components/clients-browser";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getHomeData();
  return <ClientsBrowser initial={data} />;
}
