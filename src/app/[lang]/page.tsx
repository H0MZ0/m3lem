import { catalog, locale } from "@/lib/server";
import { defaultCity, tr } from "@/lib/model";
import { seo } from "@/lib/seo";
import { HomeSearch } from "@/features/discovery/home-search";
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
    city = defaultCity(items, process.env.PILOT_CITY);
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
        <HomeSearch l={l} items={items} initial={city} />
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
