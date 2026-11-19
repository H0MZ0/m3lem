"use client";
import { useState } from "react";
import { matchesItem, tr, type Locale, type Item } from "@/lib/model";
import { Editor } from "./editor";

export function CatalogManager({ items, l }: { items: Item[]; l: Locale }) {
  const [query, setQuery] = useState(""),
    [slug, setSlug] = useState("");
  const cities = items.filter((i) => i.kind === "city"),
    found = items.filter((i) => matchesItem(i, query));
  const chosen = items.find((i) => i.slug === slug);
  return (
    <div className="panel stack">
      <Editor l={l} cities={cities} />
      <label>
        {tr(l, "قلّب فالدليل", "Rechercher dans le catalogue")}
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSlug("");
          }}
        />
      </label>
      <label>
        {tr(l, "العنصر باش تبدلو", "Entrée à modifier")}
        <select value={slug} onChange={(e) => setSlug(e.target.value)}>
          <option value="">—</option>
          {found.map((i) => (
            <option key={i.slug} value={i.slug}>
              {i[l]} · {i.slug}
            </option>
          ))}
        </select>
      </label>
      {chosen && (
        <Editor key={chosen.slug} l={l} cities={cities} item={chosen} />
      )}
    </div>
  );
}
export function TradeChoices({
  items,
  l,
  initial,
}: {
  items: Item[];
  l: Locale;
  initial: string[];
}) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState(initial);
  return (
    <fieldset>
      <legend>
        {tr(l, "الحرف (اختار وحدة ولا كثر)", "Métiers (un ou plusieurs)")}
      </legend>
      <label>
        {tr(l, "قلّب على حرفة", "Rechercher un métier")}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {chosen.map((s) => (
        <input key={s} type="hidden" name="trades" value={s} />
      ))}
      <div className="trade-choices">
        {items
          .filter((i) => matchesItem(i, query))
          .map((i) => (
            <label key={i.slug}>
              <input
                type="checkbox"
                checked={chosen.includes(i.slug)}
                onChange={(e) =>
                  setChosen(
                    e.target.checked
                      ? [...chosen, i.slug]
                      : chosen.filter((s) => s !== i.slug),
                  )
                }
              />
              {i[l]}
            </label>
          ))}
      </div>
    </fieldset>
  );
}
