import { useState } from "react";
import { type Item, type Locale, tr } from "@/lib/model";
import { ActionForm } from "@/features/accounts/form";
import { catalogSave } from "@/features/moderation/actions";
export function Editor({
  l,
  item,
  regions,
}: {
  l: Locale;
  item?: Item;
  regions: Item[];
}) {
  const t = (a: string, b: string) => tr(l, a, b);
  const [kind, setKind] = useState(item?.kind ?? "trade");
  return (
    <details>
      <summary>
        {item
          ? `${item[l]} · ${item.slug}${item.active ? "" : " (−)"}`
          : t("زيد عنصر", "Nouvelle entrée")}
      </summary>
      <ActionForm action={catalogSave.bind(null, l)} className="stack">
        <label>
          {t("المعرّف الثابت", "Identifiant stable")}
          <input
            name="slug"
            defaultValue={item?.slug}
            readOnly={!!item}
            pattern={"[a-z][a-z0-9\\-]{0,59}"}
            required
          />
        </label>
        <label>
          {t("النوع", "Type")}
          <select
            name="kind"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value === "city" ? "city" : "trade")
            }
          >
            <option value="trade">{t("حرفة", "Métier")}</option>
            <option value="city">{t("مدينة", "Ville")}</option>
          </select>
        </label>
        {kind === "city" && (
          <label>
            {t("الجهة ديال المدينة", "Région de la ville")}
            <select name="parent" required defaultValue={item?.parent ?? ""}>
              <option value="">—</option>
              {regions.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c[l]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          الدارجة
          <input
            dir="rtl"
            name="ar"
            defaultValue={item?.ar}
            required
            maxLength={80}
          />
        </label>
        <label>
          Français
          <input
            dir="ltr"
            name="fr"
            defaultValue={item?.fr}
            required
            maxLength={80}
          />
        </label>
        <label>
          {t(
            "كلمات البحث (بفاصلة)",
            "Alias de recherche (séparés par des virgules)",
          )}
          <input
            name="aliases"
            defaultValue={item?.aliases.join(", ")}
            maxLength={1600}
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="active"
            defaultChecked={item?.active ?? true}
          />
          {t("مفعّل", "Actif")}
        </label>
        <button>{t("حفظ", "Enregistrer")}</button>
      </ActionForm>
    </details>
  );
}
