import { cache } from "react";
import { notFound } from "next/navigation";
import { catalog, rpc, locale, demo } from "@/lib/server";
import { scalar, tr, nameOf, qs, type Card } from "@/lib/model";
import { seo } from "@/lib/seo";
import { Result, SearchBox } from "@/features/discovery/directory";
type Props = PageProps<"/[lang]/city/[city]/[trade]">;
const load = cache(
  async (
    city: string,
    trade: string,
    area: string,
    today: boolean,
    page: number,
  ) =>
    rpc<Card[]>("find_artisans", {
      city_slug: city,
      trade_slug: trade === "all" ? "" : trade,
      area_slug: area,
      today,
      page_no: page,
      show_demo: demo(),
    }),
);
export async function generateMetadata({ params, searchParams }: Props) {
  const { lang, city, trade } = await params,
    l = locale(lang),
    items = await catalog(),
    title =
      (trade === "all"
        ? tr(l, "الحرفيين", "Artisans")
        : nameOf(items, trade, l)) +
      " · " +
      nameOf(items, city, l);
  return seo(
    l,
    `/city/${city}/${trade}`,
    title,
    tr(l, `قارن الحرفيين: ${title}`, `Comparez les artisans : ${title}`),
    !Object.keys(await searchParams).length &&
      (await load(city, trade, "", false, 1)).length > 0,
  );
}
export default async function Page({ params, searchParams }: Props) {
  const { lang, city, trade } = await params,
    l = locale(lang),
    q = await searchParams,
    items = await catalog(),
    area = scalar(q.area),
    today = q.today === "1",
    unknown = scalar(q.q),
    page = Math.min(100000, Math.max(1, parseInt(scalar(q.page)) || 1));
  if (
    !items.some((i) => i.kind === "city" && i.slug === city) ||
    (trade !== "all" &&
      !items.some((i) => i.kind === "trade" && i.slug === trade))
  )
    notFound();
  const rows = unknown ? [] : await load(city, trade, area, today, page),
    path = `/${l}/city/${city}/${trade}`,
    query = { area, today: today ? "1" : "" };
  return (
    <>
      <p>
        <a href={`/${l}`}>{tr(l, "الرئيسية", "Accueil")}</a> /{" "}
        {nameOf(items, city, l)}
      </p>
      <h1>
        {trade === "all"
          ? tr(l, "الحرفيين", "Artisans")
          : nameOf(items, trade, l)}{" "}
        <em>· {nameOf(items, city, l)}</em>
      </h1>
      <SearchBox
        city={city}
        l={l}
        items={items}
        trade={unknown || (trade === "all" ? "" : trade)}
        area={area}
        today={today}
      />
      <h2>{tr(l, "المعلّمين اللي لقيْنا", "Artisans correspondants")}</h2>
      <div className="grid">
        {rows.slice(0, 12).map((p) => (
          <Result
            key={p.id}
            {...{ p, l, items, city, trade, area, today, page, local: demo() }}
          />
        ))}
      </div>
      {!rows.length && (
        <div className="panel">
          <p>
            {unknown
              ? tr(
                  l,
                  "ما عرفناش هاد الحرفة. اختار حرفة من اللائحة.",
                  "Métier non reconnu. Choisissez un métier dans la liste.",
                )
              : area
                ? tr(
                    l,
                    "ما لقيناش معلّم بهاد الشروط فهاد الحي.",
                    "Aucun artisan ne correspond dans ce quartier.",
                  )
                : tr(
                    l,
                    "ما لقيناش معلّم بهاد الشروط.",
                    "Aucun artisan ne correspond à ces critères.",
                  )}
          </p>
          {area && (
            <a href={path + qs({ ...query, area: "", q: unknown })}>
              {tr(l, "وسّع البحث للمدينة كاملة", "Élargir à toute la ville")}
            </a>
          )}
        </div>
      )}
      <nav className="pager">
        {page > 1 && (
          <a href={path + qs({ ...query, page: String(page - 1) })}>
            {tr(l, "السابق", "Précédent")}
          </a>
        )}
        {rows.length > 12 && (
          <a href={path + qs({ ...query, page: String(page + 1) })}>
            {tr(l, "التالي", "Suivant")}
          </a>
        )}
      </nav>
    </>
  );
}
