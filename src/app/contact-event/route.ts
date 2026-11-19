import { demo, site } from "@/lib/server";
import { uuid } from "@/lib/model";
import { countDiscovery } from "@/features/discovery/metrics";
export async function POST(request: Request) {
  if (demo() || request.headers.get("origin") !== site().origin)
    return new Response(null, { status: 204 });
  const p = new URL(request.url).searchParams,
    id = p.get("id") ?? "",
    city = p.get("city") ?? "",
    trade = p.get("trade") ?? "",
    channel = p.get("channel");
  if (
    uuid(id) &&
    /^[a-z][a-z0-9-]{0,59}$/.test(city) &&
    /^[a-z][a-z0-9-]{0,59}$/.test(trade) &&
    (channel === "call" || channel === "whatsapp")
  )
    await countDiscovery(channel, city, trade, false, id);
  return new Response(null, { status: 204 });
}
