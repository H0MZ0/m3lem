import "server-only";
import { demo, rpc } from "@/lib/server";
export async function countDiscovery(
  type: "search" | "call" | "whatsapp",
  city: string,
  trade: string,
  today = false,
  target: string | null = null,
) {
  if (demo()) return;
  try {
    await rpc(
      "count_discovery",
      { event_type: type, city_slug: city, trade_slug: trade, today, target },
      true,
    );
  } catch {
    console.warn("Discovery counter unavailable");
  }
}
export interface Summary {
  searches: number;
  empty: number;
  calls: number;
  whatsapp: number;
  gaps: { city: string; trade: string; misses: number }[];
}
