import { catalog, locale } from "@/lib/server";
import { tr } from "@/lib/model";
import { seo } from "@/lib/seo";
import { SearchBox, Shortcuts } from "@/features/discovery/directory";
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
export default async function Home({ params }: PageProps<"/[lang]">) {
  const l = locale((await params).lang),
    items = await catalog(),
    city =
      items.find((i) => i.kind === "city" && i.slug === process.env.PILOT_CITY)
        ?.slug ??
      items.find((i) => i.kind === "city")?.slug ??
      "";
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
              "قلّب على معلّم كيخدم فحومتك، وشوف خدمتو قبل ما تعيّط.",
              "Trouvez un artisan dans votre quartier. Découvrez son travail avant de l’appeler.",
            )}
          </p>
        </div>
        <div className="tile" aria-hidden="true">
          <span>✳</span>
        </div>
      </section>
      {city ? (
        <>
          <SearchBox l={l} city={city} items={items} />
          <section>
            <h2>{tr(l, "اختار الحرفة", "Par métier")}</h2>
            <Shortcuts l={l} items={items} city={city} />
          </section>
        </>
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
