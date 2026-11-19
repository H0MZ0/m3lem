"use client";
import { useState } from "react";
import { matchesItem, tr, type Item, type Locale } from "@/lib/model";
import { Shortcuts } from "./directory";
import { Finder } from "./finder";
import type { SearchDraft } from "./draft";
export function HomeSearch({
  l,
  items,
  initial,
  browse = false,
}: {
  l: Locale;
  items: Item[];
  initial: SearchDraft;
  browse?: boolean;
}) {
  const [{ city, today }, setDraft] = useState(initial),
    [filter, setFilter] = useState("");
  return (
    <>
      <Finder l={l} items={items} initial={initial} onChange={setDraft} />
      {city && (
        <section>
          <h2>{tr(l, "اختار الحرفة", "Par métier")}</h2>
          <Shortcuts l={l} items={items} city={city} today={today} />
          <details className="panel" open={browse || undefined}>
            <summary>
              {tr(l, "شوف الحرف كاملة", "Parcourir tous les métiers")}
            </summary>
            <label>
              {tr(l, "قلّب على حرفة", "Rechercher un métier")}
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </label>
            <Shortcuts
              l={l}
              items={items.filter((i) => matchesItem(i, filter))}
              city={city}
              today={today}
              expanded
            />
          </details>
        </section>
      )}
    </>
  );
}
