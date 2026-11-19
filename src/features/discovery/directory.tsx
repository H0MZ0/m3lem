import Image from "next/image";
import {
  tr,
  nameOf,
  qs,
  contacts,
  type Locale,
  type Item,
  type Card,
} from "@/lib/model";
import { Available, Location } from "./controls";
export function Icon({ slug }: { slug: string }) {
  const paths: Record<string, React.ReactNode> = {
    plomberie: (
      <>
        <path d="M4 10h8v4h8v6h-5v-2H8V14H4zM7 7h9m-4-3v6" />
      </>
    ),
    electricite: <path d="m14 2-10 12h7l-1 8 10-13h-7z" />,
    peinture: (
      <>
        <rect x="3" y="4" width="14" height="6" rx="2" />
        <path d="M17 7h3v7h-9v6" />
        <path d="M9 20v-4h4v6H9z" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="25"
      height="25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[slug] ?? <path d="m3 12 9-9 9 9v9H3z" />}
    </svg>
  );
}
export function SearchBox({
  l,
  items,
  city,
  trade = "",
  area = "",
  today = false,
  onCityChange,
}: {
  l: Locale;
  items: Item[];
  city: string;
  trade?: string;
  area?: string;
  today?: boolean;
  onCityChange?: (slug: string) => void;
}) {
  return (
    <form action={`/${l}/search`} className="finder">
      <label>
        {tr(l, "شنو خاصك؟", "De quoi avez-vous besoin ?")}
        <input
          name="q"
          list="trade-list"
          defaultValue={nameOf(items, trade, l)}
          placeholder={tr(
            l,
            "مثلاً: الماء كيسرب",
            "Ex. : fuite d’eau, plombier",
          )}
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
        initial={city}
        area={area}
        onCityChange={onCityChange}
      />
      <label className="check">
        <input type="checkbox" name="today" value="1" defaultChecked={today} />
        {tr(l, "متاح اليوم", "Disponible aujourd’hui")}
      </label>
      <button>
        {tr(l, "قلّب على معلّم", "Trouver un artisan")}{" "}
        <span aria-hidden="true">⌕</span>
      </button>
    </form>
  );
}
export function Shortcuts({
  l,
  items,
  city,
  expanded = false,
}: {
  l: Locale;
  items: Item[];
  city: string;
  expanded?: boolean;
}) {
  return (
    <div className="shortcuts">
      {items
        .filter(
          (i) =>
            i.kind === "trade" &&
            (expanded ||
              [
                "plomberie",
                "electricite",
                "peinture",
                "menuiserie",
                "maconnerie",
                "climatisation",
              ].includes(i.slug)),
        )
        .map((i) => (
          <a key={i.slug} href={`/${l}/city/${city}/${i.slug}`}>
            <span className={"icon " + i.slug}>
              <Icon slug={i.slug} />
            </span>
            {i[l]}
          </a>
        ))}
    </div>
  );
}
export function Coverage({
  p,
  l,
  items,
}: {
  p: Card;
  l: Locale;
  items: Item[];
}) {
  return (
    <>
      {nameOf(items, p.city, l)} ·{" "}
      {p.areas.length
        ? p.areas.map((a) => nameOf(items, a, l)).join("، ")
        : tr(l, "المدينة كاملة", "Toute la ville")}
    </>
  );
}
export function Contact({
  p,
  l,
  items,
  trade,
  area,
  local,
}: {
  p: Card;
  l: Locale;
  items: Item[];
  trade: string;
  area: string;
  local: boolean;
}) {
  const links = contacts(
    p.phone,
    p.whatsapp,
    p.demo || local,
    l,
    nameOf(items, trade || p.trades[0], l),
    [area, p.city]
      .filter(Boolean)
      .map((i) => nameOf(items, i, l))
      .join(" · "),
  );
  return (
    <div className="contact">
      {links ? (
        <>
          <a className="button" href={links.tel}>
            {tr(l, "عيّط", "Appeler")}
          </a>
          {links.wa && (
            <a className="button alt" href={links.wa}>
              {tr(l, "واتساب", "WhatsApp")}
            </a>
          )}
        </>
      ) : (
        <>
          <button disabled>{tr(l, "عيّط · تجريبي", "Appeler · démo")}</button>
          {p.whatsapp && (
            <button disabled>
              {tr(l, "واتساب · تجريبي", "WhatsApp · démo")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
export function Facts({ p, l }: { p: Card; l: Locale }) {
  return (
    <div className="facts">
      <span>
        {p.count
          ? `★ ${p.average} · ${p.count} ${tr(l, "آراء", "avis")}`
          : tr(l, "باقي ما كاين حتى رأي", "Pas encore d’avis")}
      </span>
      <span>
        {tr(l, "التنقل: ", "Déplacement : ")}
        {p.fee === null ? (
          tr(l, "ما تحددش", "non précisé")
        ) : p.fee === 0 ? (
          tr(l, "مجاني", "gratuit")
        ) : (
          <bdi>{p.fee} MAD</bdi>
        )}
      </span>
    </div>
  );
}
export function Badge({ p, l }: { p: Card; l: Locale }) {
  return p.available_at && p.expires_at ? (
    <Available at={p.available_at} expires={p.expires_at} fresh l={l} />
  ) : null;
}
export function Result({
  p,
  l,
  items,
  city,
  trade,
  area,
  today,
  page,
  local,
}: {
  p: Card;
  l: Locale;
  items: Item[];
  city: string;
  trade: string;
  area: string;
  today: boolean;
  page: number;
  local: boolean;
}) {
  const href =
    `/${l}/p/${p.id}` +
    qs({
      city,
      trade,
      area,
      today: today ? "1" : "",
      page: page > 1 ? String(page) : "",
    });
  return (
    <article className="card">
      <header>
        <span className={"avatar " + p.trades[0]}>
          {p.gallery[0] ? (
            <Image
              unoptimized
              src={`/media/${p.gallery[0]}?size=small`}
              width={48}
              height={48}
              className="thumb"
              alt={tr(l, `خدمة من ${p.name}`, `Réalisation de ${p.name}`)}
            />
          ) : (
            <Icon slug={p.trades[0]} />
          )}
        </span>
        <div>
          <small>{p.trades.map((t) => nameOf(items, t, l)).join(" · ")}</small>
          <h3>
            <a href={href}>{p.name}</a>
          </h3>
        </div>
      </header>
      <p>
        <Coverage items={items} p={p} l={l} />
      </p>
      <Badge p={p} l={l} />
      <Facts p={p} l={l} />
      <Contact
        p={p}
        l={l}
        items={items}
        trade={trade === "all" ? "" : trade}
        area={area}
        local={local}
      />
    </article>
  );
}
