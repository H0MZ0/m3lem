import { NextRequest, NextResponse } from "next/server";
import { catalog, locale } from "@/lib/server";
import { resolveTrade, qs } from "@/lib/model";
export async function GET(
  req: NextRequest,
  { params }: RouteContext<"/[lang]/search">,
) {
  const l = locale((await params).lang),
    p = req.nextUrl.searchParams,
    items = await catalog(),
    q = (p.get("q") ?? "").trim().slice(0, 100),
    city = items.find((i) => i.slug === p.get("city") && i.kind === "city");
  if (!city) return NextResponse.redirect(new URL(`/${l}`, req.url));
  const trade = q ? resolveTrade(items, q) : "all";
  return NextResponse.redirect(
    new URL(
      `/${l}/city/${city.slug}/${trade ?? "all"}` +
        qs({
          q: trade ? "" : q,
          area: p.get("area") ?? "",
          today: p.get("today") === "1" ? "1" : "",
        }),
      req.url,
    ),
  );
}
