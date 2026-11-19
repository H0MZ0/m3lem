import { locale, access, rpc, catalog } from "@/lib/server";
import { tr, type Workspace, stateName, defaultCity } from "@/lib/model";
import { TradeChoices } from "@/features/catalog/pickers";
import { ActionForm } from "@/features/accounts/form";
import { Location } from "@/features/discovery/controls";
import { signout } from "@/features/accounts/actions";
import { Photo } from "@/features/profiles/photo";
import {
  save,
  availability,
  upload,
  removeAsset,
} from "@/features/profiles/actions";
export default async function WorkspacePage({
  params,
}: PageProps<"/[lang]/workspace">) {
  const l = locale((await params).lang);
  await access(l);
  const [w, items, staff] = await Promise.all([
      rpc<Workspace | null>("my_workspace"),
      catalog(),
      rpc<boolean>("is_staff"),
    ]),
    r = w?.revision,
    t = (a: string, b: string) => tr(l, a, b);
  return (
    <section className="narrow">
      <div className="toolbar">
        <h1>{t("فضاء المعلّم", "Espace artisan")}</h1>
        <form action={signout.bind(null, l)}>
          <button className="alt">{t("خرج", "Déconnexion")}</button>
        </form>
      </div>
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
      {w?.published && (
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
      {w?.state !== "suspended" && (
        <>
          <ActionForm
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
                .filter((i) => i.kind === "trade" && r?.trades.includes(i.slug))
                .map((i) => i.slug)}
            />
            <Location
              multiple
              items={items}
              l={l}
              initial={r?.city ?? defaultCity(items, process.env.PILOT_CITY)}
              areas={r?.areas}
            />
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
            {!!w?.assets.length && (
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
                        <Photo {...{ id, l, n: i + 1, name: r?.name ?? "" }} />
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
            )}
            <div className="buttons">
              <button name="mode" value="submit">
                {t("صيفط للمراجعة", "Envoyer en révision")}
              </button>
              <button className="alt" name="mode" value="draft">
                {t("حفظ المسودة", "Enregistrer le brouillon")}
              </button>
            </div>
          </ActionForm>
          {w ? (
            <ActionForm className="panel stack" action={upload.bind(null, l)}>
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
              <p>
                {t(
                  "من بعد التحميل، اختار الصورة فالبروفايل وصيفطها للمراجعة.",
                  "Après envoi, sélectionnez la photo dans la fiche et soumettez-la en révision.",
                )}
              </p>
              <button>{t("حمّل الصورة", "Importer la photo")}</button>
            </ActionForm>
          ) : (
            <p>
              {t(
                "حفظ المسودة باش تزيد التصاور.",
                "Enregistrez un brouillon pour importer des photos.",
              )}
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
                  <ActionForm key={id} action={removeAsset.bind(null, l, id)}>
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
    </section>
  );
}
