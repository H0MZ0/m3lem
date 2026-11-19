"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { tr, type Item, type Locale } from "@/lib/model";
import { Location } from "./controls";
import { useSearchDraft } from "./draft-context";
import type { SearchDraft } from "./draft";
export function Finder({
  items,
  l,
  initial,
  onChange,
}: {
  items: Item[];
  l: Locale;
  initial: SearchDraft;
  onChange?: (d: SearchDraft) => void;
}) {
  const [d, set] = useState(initial),
    { publish } = useSearchDraft(),
    path = usePathname();
  function change(patch: Partial<SearchDraft>) {
    const draft = { ...d, ...patch };
    set(draft);
    publish({ path, draft });
    onChange?.(draft);
  }
  return (
    <form action={`/${l}/search`} className="finder">
      <label>
        {tr(l, "شنو خاصك؟", "De quoi avez-vous besoin ?")}
        <input
          name="q"
          list="trade-list"
          value={d.q}
          onChange={(e) => change({ q: e.target.value })}
          placeholder={tr(l, "مثلاً: الما كيسرب", "Ex. : fuite d’eau, plombier")}
          maxLength={100}
        />
        <datalist id="trade-list">
          {items
            .filter((i) => i.kind === "trade")
            .map((i) => (
              <option key={i.slug} value={i[l]} />
            ))}
        </datalist>
      </label>
      <Location
        l={l}
        items={items}
        initial={initial.city}
        initialRegion={initial.region}
        onCityChange={(city, region) => change({ city, region })}
      />
      <label className="check">
        <input
          type="checkbox"
          name="today"
          value="1"
          checked={d.today}
          onChange={(e) => change({ today: e.target.checked })}
        />
        {tr(l, "متاح اليوم", "Disponible aujourd’hui")}
      </label>
      <button>{tr(l, "قلّب على معلّم", "Trouver un artisan")}</button>
    </form>
  );
}
