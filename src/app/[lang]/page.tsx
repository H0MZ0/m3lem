import { catalog, locale } from "@/lib/server";
import { tr } from "@/lib/model";
import { seo } from "@/lib/seo";
import { HomeSearch } from "@/features/discovery/home-search";
import { readDraft } from "@/features/discovery/draft";
export async function generateMetadata({ params }: PageProps<"/[lang]">) {
  const l = locale((await params).lang);
  return seo(
    l,
    "",
    tr(l, "قلّب على معلّم قريب", "Artisans près de chez vous"),
    tr(
      l,
      "اختار الحرفة والمدينة وتواصل مباشرة.",
      "Choisissez un métier et une ville pour contacter un artisan.",
    ),
  );
}
export default async function Home({
  params,
  searchParams,
}: PageProps<"/[lang]">) {
  const l = locale((await params).lang),
    items = await catalog(),
    paramsQuery = await searchParams;
  return (
    <>
      <section className="hero">
        <div>
          <small className="kicker">
            {tr(l, "دليل الحرفيين", "LE CARNET DES ARTISANS")}
          </small>
          <h1>{tr(l, "شنو خاصك؟", "De quoi avez-vous besoin ?")}</h1>
          <p>
            {tr(
              l,
              "اختار الجهة والمدينة باش تلقى معلّم قريب ليك.",
              "Choisissez votre région puis votre ville pour trouver un artisan.",
            )}
          </p>
        </div>
        <div className="tile" aria-hidden="true">
          <span>✳</span>
        </div>
      </section>
      {items.some((i) => i.kind === "city" && i.parent) ? (
        <HomeSearch
          l={l}
          items={items}
          browse={paramsQuery.browse === "1"}
          initial={
            readDraft(items, paramsQuery) ?? {
              city: "",
              region: "",
              q: "",
              today: false,
            }
          }
        />
      ) : (
        <p>
          {tr(
            l,
            "باقي ما تزادت حتى مدينة.",
            "Aucune ville ouverte pour le moment.",
          )}
        </p>
      )}
    </>
  );
}
