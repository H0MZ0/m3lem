"use client";
import { useState } from "react";
import { matchesItem, tr, type Item, type Locale } from "@/lib/model";
import { SearchBox, Shortcuts } from "./directory";
export function HomeSearch({
  l,
  items,
  initial,
}: {
  l: Locale;
  items: Item[];
  initial: string;
}) {
  const [city, setCity] = useState(initial),
    [filter, setFilter] = useState("");
  return (
    <>
      <SearchBox l={l} items={items} city={initial} onCityChange={setCity} />
      {city && (
        <section>
          <h2>{tr(l, "اختار الحرفة", "Par métier")}</h2>
          <Shortcuts l={l} items={items} city={city} />
          <details className="panel">
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
              expanded
            />
          </details>
        </section>
      )}
    </>
  );
}
