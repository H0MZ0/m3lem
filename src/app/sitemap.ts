import type { MetadataRoute } from "next";
import { site, demo, rpc } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (demo()) return [];
  const rows =
    await rpc<{ id: string; city: string; trade: string }[]>("index_entries");
  const paths = new Set([
    "",
    ...rows.flatMap((r) => [
      `/p/${r.id}`,
      `/city/${r.city}/${r.trade}`,
      `/city/${r.city}/all`,
    ]),
  ]);
  return [...paths].flatMap((p) =>
    ["ar", "fr"].map((l) => ({
      url: site().origin + `/${l}${p}`,
      alternates: {
        languages: {
          ary: site().origin + "/ar" + p,
          fr: site().origin + "/fr" + p,
        },
      },
    })),
  );
}
