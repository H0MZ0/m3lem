"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { tr, matchesItem, type Item, type Locale } from "@/lib/model";
export function Language({ l }: { l: Locale }) {
  const path = usePathname(),
    q = useSearchParams().toString(),
    other = l === "ar" ? "fr" : "ar";
  return (
    <a
      className="lang"
      href={
        path.replace(/^\/(ar|fr)(?=\/|$)/, `/${other}`) + (q ? "?" + q : "")
      }
      lang={other}
      hrefLang={other}
    >
      {other === "ar" ? "الدارجة" : "Français"}
    </a>
  );
}
export function Location({
  items,
  l,
  initial,
  area = "",
  multiple = false,
  areas = [],
  onCityChange,
}: {
  items: Item[];
  l: Locale;
  initial: string;
  area?: string;
  multiple?: boolean;
  areas?: string[];
  onCityChange?: (slug: string) => void;
}) {
  const [city, setCity] = useState(initial);
  const [query, setQuery] = useState("");
  const cities = items
    .filter((i) => i.kind === "city")
    .sort((a, b) => a[l].localeCompare(b[l], l));
  function choose(value: string) {
    setCity(value);
    onCityChange?.(value);
  }
  const list = items.filter((i) => i.parent === city);
  return (
    <>
      <div>
        <label>
          {tr(l, "فين؟ المدينة", "Où ? Ville")}
          <select
            name="city"
            value={city}
            onChange={(e) => choose(e.target.value)}
            required
          >
            {!city && (
              <option value="">
                {tr(l, "اختار المدينة", "Choisissez la ville")}
              </option>
            )}
            {cities
              .filter((i) => matchesItem(i, query))
              .map((i) => (
                <option key={i.slug} value={i.slug}>
                  {i[l]}
                </option>
              ))}
          </select>
        </label>
        <details>
          <summary>{tr(l, "قلّب بالاسم", "Rechercher la ville")}</summary>
          <label>
            {tr(l, "اسم المدينة", "Nom de la ville")}
            <input
              type="search"
              value={query}
              onChange={(e) => {
                const text = e.target.value;
                setQuery(text);
                const found = cities.filter((i) => matchesItem(i, text));
                if (found.length === 1) choose(found[0].slug);
                else if (!found.some((i) => i.slug === city)) choose("");
              }}
            />
          </label>
        </details>
      </div>
      {multiple ? (
        <fieldset key={city}>
          <legend>
            {tr(
              l,
              "الأحياء · بلا اختيار = المدينة كاملة",
              "Quartiers · aucun = toute la ville",
            )}
          </legend>
          {list.map((i) => (
            <label key={i.slug}>
              <input
                type="checkbox"
                name="areas"
                value={i.slug}
                defaultChecked={areas.includes(i.slug)}
              />
              {i[l]}
            </label>
          ))}
        </fieldset>
      ) : (
        <label>
          {tr(l, "الحي (اختياري)", "Quartier (facultatif)")}
          <select
            key={city}
            defaultValue={city === initial ? area : ""}
            name="area"
          >
            <option value="">{tr(l, "المدينة كاملة", "Toute la ville")}</option>
            {list.map((i) => (
              <option key={i.slug} value={i.slug}>
                {i[l]}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
export function Available({
  at,
  expires,
  l,
  fresh,
}: {
  at: string;
  expires: string;
  l: Locale;
  fresh: boolean;
}) {
  const [visible, setVisible] = useState(fresh);
  const router = useRouter();
  useEffect(() => {
    const end = Date.parse(expires);
    let refreshed = false;
    const check = () => {
      const yes = Date.now() < end;
      setVisible(yes);
      if (!yes && fresh && !refreshed) {
        refreshed = true;
        router.refresh();
      }
    };
    check();
    const timer = setTimeout(check, Math.max(0, end - Date.now() + 10));
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [expires, fresh, router]);
  return visible ? (
    <span className="badge">
      {tr(l, "متاح اليوم", "Disponible aujourd’hui")} ·{" "}
      <bdi>
        {new Intl.DateTimeFormat("fr-MA", {
          timeZone: "Africa/Casablanca",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(at))}
      </bdi>
    </span>
  ) : null;
}
