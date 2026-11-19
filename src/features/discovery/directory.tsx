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
import { Available } from "./controls";
import { ContactLink } from "./contact-link";
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
export function Shortcuts({
  l,
  items,
  city,
  expanded = false,
  today = false,
}: {
  l: Locale;
  items: Item[];
  city: string;
  expanded?: boolean;
  today?: boolean;
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
          <a
            key={i.slug}
            href={
              `/${l}/search` + qs({ city, q: i.slug, today: today ? "1" : "" })
            }
          >
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
  return nameOf(items, p.city, l);
}
export function Contact({
  p,
  l,
  items,
  trade,
  local,
}: {
  p: Card;
  l: Locale;
  items: Item[];
  trade: string;
  local: boolean;
}) {
  const links = contacts(
    p.phone,
    p.whatsapp,
    p.demo || local,
    l,
    nameOf(items, trade || p.trades[0], l),
    nameOf(items, p.city, l),
  );
  return (
    <div className="contact">
      {links ? (
        <>
          <ContactLink
            channel="call"
            trade={trade || p.trades[0]}
            id={p.id}
            city={p.city}
            href={links.tel}
          >
            {tr(l, "عيّط", "Appeler")}
          </ContactLink>
          {links.wa && (
            <ContactLink
              channel="whatsapp"
              trade={trade || p.trades[0]}
              id={p.id}
              city={p.city}
              href={links.wa}
            >
              {tr(l, "واتساب", "WhatsApp")}
            </ContactLink>
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
  today,
  page,
  local,
}: {
  p: Card;
  l: Locale;
  items: Item[];
  city: string;
  trade: string;
  today: boolean;
  page: number;
  local: boolean;
}) {
  const href =
    `/${l}/p/${p.id}` +
    qs({
      city,
      trade,
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
      <p className="service-line">{p.services}</p>
      <p>
        <Coverage items={items} p={p} l={l} />
      </p>
      <Badge p={p} l={l} />
      <Facts p={p} l={l} />
      <a href={href}>
        {p.gallery.length
          ? tr(l, "شوف خدمتو", "Voir ses réalisations")
          : tr(l, "شوف الخدمات ديالو", "Voir ses services")}
      </a>
      <Contact
        p={p}
        l={l}
        items={items}
        trade={trade === "all" ? "" : trade}
        local={local}
      />
    </article>
  );
}
