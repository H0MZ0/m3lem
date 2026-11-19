"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { tr, type Item, type Locale } from "@/lib/model";
import { useSearchDraft } from "./draft-context";
export function Language({ l }: { l: Locale }) {
  const path = usePathname(),
    params = new URLSearchParams(useSearchParams().toString()),
    other = l === "ar" ? "fr" : "ar";
  const { entry } = useSearchDraft();
  if (entry?.path === path) {
    const d = entry.draft;
    for (const [key, value] of Object.entries({
      edit: "1",
      dq: d.q,
      dc: d.city,
      dr: d.region,
      dt: d.today ? "1" : "",
    })) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
  }
  const q = params.toString();
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
  initialRegion,
  onCityChange,
}: {
  items: Item[];
  l: Locale;
  initial: string;
  initialRegion?: string;
  onCityChange?: (slug: string, region: string) => void;
}) {
  const [city, setCity] = useState(initial);
  const [region, setRegion] = useState(
    initialRegion ??
      items.find((i) => i.kind === "city" && i.slug === initial)?.parent ??
      "",
  );
  const cities = items
    .filter((i) => i.kind === "city" && i.parent === region)
    .sort((a, b) => a[l].localeCompare(b[l], l));
  function choose(value: string, parent = region) {
    setCity(value);
    onCityChange?.(value, parent);
  }
  return (
    <>
      <label>
        {tr(l, "الجهة", "Région")}
        <select
          name="region"
          value={region}
          required
          onChange={(e) => {
            setRegion(e.target.value);
            choose("", e.target.value);
          }}
        >
          <option value="" disabled>
            {tr(l, "اختار الجهة", "Choisissez la région")}
          </option>
          {items
            .filter((i) => i.kind === "region")
            .map((i) => (
              <option key={i.slug} value={i.slug}>
                {i[l]}
              </option>
            ))}
        </select>
      </label>
      <label>
        {tr(l, "المدينة", "Ville")}
        <select
          name="city"
          value={city}
          onChange={(e) => choose(e.target.value)}
          disabled={!region}
          required
        >
          <option value="" disabled>
            {region
              ? tr(l, "اختار المدينة", "Choisissez la ville")
              : tr(l, "اختار الجهة أولا", "Choisissez d’abord la région")}
          </option>
          {cities.map((i) => (
            <option key={i.slug} value={i.slug}>
              {i[l]}
            </option>
          ))}
        </select>
      </label>
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
