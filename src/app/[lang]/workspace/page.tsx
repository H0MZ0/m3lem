import Image from "next/image";
import { locale, access, rpc, catalog } from "@/lib/server";
import {
  tr,
  nameOf,
  requestContacts,
  type ServiceRequest,
  type Workspace,
  stateName,
} from "@/lib/model";
import { TradeChoices } from "@/features/catalog/pickers";
import { ActionForm } from "@/features/accounts/form";
import { Location } from "@/features/discovery/controls";
import { signout } from "@/features/accounts/actions";
import { Photo } from "@/features/profiles/photo";
import { respond } from "@/features/requests/actions";
import {
  save,
  availability,
  upload,
  removeAsset,
  saveGallery,
} from "@/features/profiles/actions";
export default async function WorkspacePage({
  params,
  searchParams,
}: PageProps<"/[lang]/workspace">) {
  const l = locale((await params).lang);
  await access(l);
  const [w, items, staff, requests] = await Promise.all([
      rpc<Workspace | null>("my_workspace"),
      catalog(),
      rpc<boolean>("is_staff"),
      rpc<ServiceRequest[]>("my_requests"),
    ]),
    r = w?.revision,
    requested = (await searchParams).tab,
    tab =
      requested === "photos" ||
      requested === "profile" ||
      requested === "today" ||
      requested === "requests"
        ? requested
        : w
          ? "today"
          : "profile",
    t = (a: string, b: string) => tr(l, a, b);
  return (
    <section className="narrow">
      <div className="toolbar">
        <h1>{t("فضاء المعلّم", "Espace artisan")}</h1>
        <form action={signout.bind(null, l)}>
          <button className="alt">{t("خرج", "Déconnexion")}</button>
        </form>
      </div>
      <nav className="tabs" aria-label={t("فضاء المعلّم", "Espace artisan")}>
        {[
          ["today", t("اليوم", "Aujourd’hui")],
          [
            "requests",
            t("الطلبات", "Demandes") +
              (requests.length ? ` (${requests.length})` : ""),
          ],
          ["profile", t("البروفايل", "Ma fiche")],
          ["photos", t("صور خدمتي", "Mes photos")],
        ].map(([id, text]) => (
          <a
            key={id}
            aria-current={tab === id ? "page" : undefined}
            href={`/${l}/workspace?tab=${id}`}
          >
            {text}
          </a>
        ))}
      </nav>
      {staff && (
        <p>
          <a href={`/${l}/admin`}>
            {t("دخل للإدارة", "Ouvrir l’administration")}
          </a>
        </p>
      )}
      {w && (
        <aside className="notice">
          <b>{stateName(w.state, l)}</b>
          {w.published && (
            <>
              {" "}
              ·{" "}
              {t(
                "النسخة المقبولة باقية منشورة",
                "La version approuvée reste publique",
              )}
            </>
          )}
          {w.feedback && <p>{w.feedback}</p>}
        </aside>
      )}
      {tab === "today" && w?.published && (
        <a href={`/${l}/p/${w.id}`}>
          {t("شوف البروفايل ديالك كيف كيبان للزبون", "Voir ma fiche publique")}
        </a>
      )}
      {tab === "today" && !w?.published && (
        <p>
          <a href={`/${l}/workspace?tab=profile`}>
            {t("فتح البروفايل ديالي", "Ouvrir ma fiche")}
          </a>
        </p>
      )}
      {tab === "today" && w?.published && (
        <ActionForm className="panel" action={availability.bind(null, l)}>
          <h2>{t("واش متاح اليوم؟", "Disponible aujourd’hui ?")}</h2>
          {w.available_at && (
            <p>
              {t("آخر تأكيد", "Dernière confirmation")} :{" "}
              <bdi>
                {new Date(w.available_at).toLocaleString("fr-MA", {
                  timeZone: "Africa/Casablanca",
                })}
              </bdi>
            </p>
          )}
          <div className="buttons">
            <button name="available" value="yes">
              {t("أكد اليوم", "Confirmer pour aujourd’hui")}
            </button>
            <button className="alt" name="available" value="no">
              {t("حيّد التوفر", "Retirer la disponibilité")}
            </button>
          </div>
        </ActionForm>
      )}
      {tab === "requests" && (
        <section>
          <h2>{t("طلبات الخدمة المطابقة", "Demandes correspondantes")}</h2>
          {!w?.published ? (
            <p>
              {t(
                "باش تشوف الطلبات، خاص البروفايل ديالك يكون منشور.",
                "Publiez votre fiche pour voir les demandes.",
              )}{" "}
              <a href={`/${l}/workspace?tab=profile`}>
                {t("كمّل البروفايل", "Compléter ma fiche")}
              </a>
            </p>
          ) : requests.length ? (
            requests.map((req) => {
              const links = requestContacts(
                req.phone,
                l,
                r?.name ?? "",
                nameOf(items, req.trade, l),
                nameOf(items, req.city, l),
                req.ref,
              );
              return (
                <article className="panel request-card" key={req.id}>
                  <header>
                    <strong>{nameOf(items, req.trade, l)}</strong> ·{" "}
                    {nameOf(items, req.city, l)}
                    <small>
                      <bdi>{req.ref}</bdi> ·{" "}
                      {new Date(req.created_at).toLocaleString("fr-MA", {
                        timeZone: "Africa/Casablanca",
                      })}
                    </small>
                  </header>
                  <p>{req.description}</p>
                  {!!req.photos.length && (
                    <div className="gallery request-photos">
                      {req.photos.map((id, i) => (
                        <Image
                          key={id}
                          unoptimized
                          width={480}
                          height={320}
                          className="photo"
                          src={`/request-media/${id}`}
                          alt={t(
                            `تصويرة من الطلب · ${i + 1}`,
                            `Photo de la demande · ${i + 1}`,
                          )}
                        />
                      ))}
                    </div>
                  )}
                  <p className="request-meta">
                    {t("الزبون", "Client")} : {req.name} ·{" "}
                    <bdi>{req.phone}</bdi>
                  </p>
                  {links && (
                    <div className="contact">
                      <a className="button" href={links.tel}>
                        {t("عيّط", "Appeler")}
                      </a>
                      <a className="button alt" href={links.wa}>
                        {t("واتساب", "WhatsApp")}
                      </a>
                    </div>
                  )}
                  <ActionForm action={respond.bind(null, l, req.id)}>
                    {req.responded ? (
                      <p className="notice">
                        {t("سجلتي التواصل", "Contact enregistré")}
                      </p>
                    ) : (
                      <button className="alt">
                        {t("تم التواصل", "J’ai contacté")}
                      </button>
                    )}
                  </ActionForm>
                  <small>
                    {t(
                      "«تم التواصل» كيسجل بلي شفت الطلب وعيّطتي. ما كيضمنش أن الزبون جاوب.",
                      "« J’ai contacté » enregistre votre démarche. Cela ne garantit pas la réponse du client.",
                    )}
                  </small>
                </article>
              );
            })
          ) : (
            <p>
              {t(
                "ما كاين حتى طلب مطابق دابا. الطلبات اللي فمدينتك وفالحرف اللي مسجل فيهم غادي يبانو هنا.",
                "Aucune demande correspondante pour le moment. Les demandes de votre ville et de vos métiers apparaîtront ici.",
              )}
            </p>
          )}
        </section>
      )}
      {w?.state !== "suspended" && (
        <>
          {tab === "profile" && (
            <ActionForm
              keepValues
              key={r?.id ?? "new"}
              action={save.bind(null, l)}
              className="panel stack"
            >
              <h2>{t("البروفايل ديالك", "Votre fiche")}</h2>
              <input type="hidden" name="base" value={r?.id ?? ""} />
              <label>
                {t("الاسم اللي غادي يبان", "Nom public")}
                <input
                  name="name"
                  minLength={2}
                  maxLength={80}
                  required
                  defaultValue={r?.name}
                />
              </label>
              <label>
                {t("الخدمات", "Services proposés")}
                <textarea
                  name="services"
                  required
                  minLength={3}
                  maxLength={1200}
                  defaultValue={r?.services}
                />
              </label>
              <TradeChoices
                l={l}
                items={items.filter((i) => i.kind === "trade")}
                initial={items
                  .filter(
                    (i) => i.kind === "trade" && r?.trades.includes(i.slug),
                  )
                  .map((i) => i.slug)}
              />
              <Location items={items} l={l} initial={r?.city ?? ""} />
              <label>
                {t("نمرة التواصل", "Téléphone public")}
                <input
                  type="tel"
                  dir="ltr"
                  name="phone"
                  required
                  defaultValue={r?.phone}
                  placeholder="06… / +212…"
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  name="consent"
                  defaultChecked={r?.consent}
                />
                {t(
                  "موافق تبان النمرة للعموم (ضروري للنشر)",
                  "J’accepte la publication du numéro (requis pour publier)",
                )}
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  name="whatsapp"
                  defaultChecked={r?.whatsapp}
                />
                {t("تفعيل واتساب", "Activer WhatsApp")}
              </label>
              <label>
                {t(
                  "ثمن التنقل بالدرهم · 0 مجاني، خاوي ما محددش",
                  "Déplacement en MAD · 0 = gratuit, vide = non précisé",
                )}
                <input
                  name="fee"
                  type="number"
                  min="0"
                  max="100000"
                  defaultValue={r?.fee ?? ""}
                />
              </label>
              <div className="buttons">
                <button name="mode" value="submit">
                  {t("صيفط للمراجعة", "Envoyer en révision")}
                </button>
                <button className="alt" name="mode" value="draft">
                  {t("حفظ المسودة", "Enregistrer le brouillon")}
                </button>
              </div>
            </ActionForm>
          )}
          {tab === "photos" && (
            <>
              {w && (
                <ActionForm
                  className="panel stack"
                  action={upload.bind(null, l)}
                >
                  <h2>{t("زيد تصويرة", "Ajouter une photo")}</h2>
                  <label>
                    {t(
                      "JPEG، PNG، WebP · حتى 5 MiB",
                      "JPEG, PNG, WebP · 5 Mio maximum",
                    )}
                    <input
                      type="file"
                      name="image"
                      required
                      accept="image/jpeg,image/png,image/webp"
                    />
                  </label>
                  <button>{t("حمّل الصورة", "Importer la photo")}</button>
                  <small>
                    {t(
                      "من بعد التحميل، اختار الصور ورتّبهم وصيفطهم للمراجعة.",
                      "Après import, sélectionnez et classez vos photos, puis envoyez-les en révision.",
                    )}
                  </small>
                </ActionForm>
              )}
              {!!w?.assets.length && (
                <ActionForm
                  key={r?.id}
                  action={saveGallery.bind(null, l)}
                  keepValues
                  className="panel stack"
                >
                  <input type="hidden" name="base" value={r?.id ?? ""} />
                  <fieldset>
                    <legend>
                      {t(
                        "اختار الصور ورتبهم من 1 حتى 8",
                        "Sélectionnez et classez les photos de 1 à 8",
                      )}
                    </legend>
                    <div className="gallery">
                      {[...new Set([...(r?.gallery ?? []), ...w.assets])].map(
                        (id, i) => (
                          <div key={id}>
                            <Photo
                              {...{ id, l, n: i + 1, name: r?.name ?? "" }}
                            />
                            <label>
                              <input
                                type="checkbox"
                                name="media"
                                value={id}
                                defaultChecked={r?.gallery.includes(id)}
                              />
                              {t("عرض الصورة", "Afficher la photo")} {i + 1}
                            </label>
                            <label>
                              {t("الترتيب", "Rang")}
                              <input
                                type="number"
                                name={"order:" + id}
                                min={1}
                                max={8}
                                defaultValue={i < 8 ? i + 1 : undefined}
                              />
                            </label>
                          </div>
                        ),
                      )}
                    </div>
                  </fieldset>
                  <div className="buttons">
                    <button name="mode" value="submit">
                      {t("صيفط للمراجعة", "Envoyer en révision")}
                    </button>
                    <button className="alt" name="mode" value="draft">
                      {t("حفظ المسودة", "Enregistrer le brouillon")}
                    </button>
                  </div>
                </ActionForm>
              )}
              {!w && (
                <p>
                  <a href={`/${l}/workspace?tab=profile`}>
                    {t(
                      "حفظ المسودة باش تزيد التصاور.",
                      "Enregistrez un brouillon pour importer des photos.",
                    )}
                  </a>
                </p>
              )}
              {!!w?.assets.length && (
                <details className="panel">
                  <summary>
                    {t(
                      "مسح تصاور ما مستعملينش",
                      "Supprimer des photos inutilisées",
                    )}
                  </summary>
                  <div className="gallery">
                    {w.assets.map((id, i) => (
                      <ActionForm
                        key={id}
                        action={removeAsset.bind(null, l, id)}
                      >
                        <Photo id={id} n={i + 1} l={l} name={r?.name ?? ""} />
                        <button className="alt">
                          {t("مسح", "Supprimer")} {i + 1}
                        </button>
                      </ActionForm>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
