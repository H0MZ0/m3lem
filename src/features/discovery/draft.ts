import { scalar, type Query, type Item } from "@/lib/model";
export type SearchDraft = {
  q: string;
  region: string;
  city: string;
  today: boolean;
};
export function readDraft(
  items: Item[],
  params: Query,
): SearchDraft | undefined {
  if (params.edit !== "1") return;
  const region =
    items.find((i) => i.kind === "region" && i.slug === params.dr)?.slug ?? "";
  return {
    q: scalar(params.dq).slice(0, 100),
    region,
    city:
      items.find(
        (i) => i.kind === "city" && i.parent === region && i.slug === params.dc,
      )?.slug ?? "",
    today: params.dt === "1",
  };
}
