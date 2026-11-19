export type Locale = "ar" | "fr";
export const tr = (l: Locale, ar: string, fr: string) => (l === "ar" ? ar : fr);
export type Item = {
  slug: string;
  kind: "trade" | "city" | "region";
  parent: string | null;
  ar: string;
  fr: string;
  aliases: string[];
  active: boolean;
};
export type Revision = {
  id: string;
  name: string;
  services: string;
  city: string;
  trades: string[];
  phone: string;
  consent: boolean;
  whatsapp: boolean;
  fee: number | null;
  gallery: string[];
};
export type Card = Omit<Revision, "consent" | "phone"> & {
  phone: string | null;
  demo: boolean;
  verified: boolean;
  available_at: string | null;
  expires_at: string | null;
  count: number;
  average: number | null;
};
export type Detail = Card & { reviews: { rating: number; comment: string }[] };
export type State = "draft" | "pending" | "published" | "suspended";
export type Workspace = {
  id: string;
  revision: Revision;
  published: boolean;
  state: State;
  feedback: string;
  available_at: string | null;
  assets: string[];
};
export type Queue = {
  profiles: {
    id: string;
    revision: Revision;
    state: State;
    feedback: string;
    live: string | null;
    previous: Revision | null;
    verified_at: string | null;
  }[];
  reports: { id: string; profile: string; reason: string }[];
  reviews: { id: string; profile: string; rating: number; comment: string }[];
};
export type Query = Record<string, string | string[] | undefined>;
export const scalar = (v: Query[string]) => (typeof v === "string" ? v : "");
export function normalize(s: string) {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
function searchKey(s: string) {
  return normalize(s)
    .replace(/[’']/g, " ")
    .split(/\s+/)
    .map(
      (word) =>
        ({
          الما: "الماء",
          لما: "الماء",
          كيتسرب: "كيسرب",
          تايسرب: "كيسرب",
          كيتسرّب: "كيسرب",
        })[word] ?? word,
    )
    .join(" ");
}
const terms = (i: Item) => [i.slug, i.ar, i.fr, ...i.aliases].map(searchKey);
export function resolveTrade(items: Item[], q: string) {
  const key = searchKey(q);
  return items.find((i) => i.kind === "trade" && terms(i).includes(key))?.slug;
}
/** Rank near matches as choices; never substitute a different trade silently. */
export function suggestTrades(items: Item[], q: string): Item[] {
  const key = searchKey(q),
    words = key.split(" ").filter((w) => w.length >= 3);
  if (!words.length) return [];
  return items
    .filter((i) => i.kind === "trade")
    .map((item) => {
      const names = terms(item),
        tokens = names.flatMap((v) => v.split(/[\s-]+/));
      const score = words.reduce(
        (n, w) =>
          n +
          (tokens.includes(w)
            ? 4
            : tokens.some((t) => t.startsWith(w))
              ? 2
              : 0),
        0,
      );
      return { item, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.slug.localeCompare(b.item.slug))
    .slice(0, 4)
    .map((r) => r.item);
}
export function matchesItem(i: Item, query: string) {
  const q = normalize(query);
  return (
    !q ||
    [i.ar, i.fr, i.slug, ...i.aliases].some((label) =>
      normalize(label).includes(q),
    )
  );
}
export function normalizePhone(input: string) {
  const s = input
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x660))
    .replace(/[\s().-]/g, "")
    .replace(/^00212/, "+212")
    .replace(/^0/, "+212");
  return /^\+212[567]\d{8}$/.test(s) ? s : null;
}
export function contacts(
  phone: string | null,
  whatsapp: boolean,
  demo: boolean,
  l: Locale,
  trade: string,
  city: string,
) {
  const n = phone && normalizePhone(phone);
  if (!n || demo) return null;
  const text = tr(
    l,
    `سلام، خاصني ${trade} فـ ${city}. واش ممكن نهضرو؟`,
    `Bonjour, je cherche un artisan pour ${trade} à ${city}. Pouvons-nous en discuter ?`,
  );
  return {
    tel: `tel:${n}`,
    wa: whatsapp
      ? `https://wa.me/${n.slice(1)}?text=${encodeURIComponent(text)}`
      : null,
  };
}
export const uuid = (s: string) =>
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s);
export const stateName = (s: State, l: Locale) =>
  ({
    draft: tr(l, "مسودة", "Brouillon"),
    pending: tr(l, "كيتراجع", "En révision"),
    published: tr(l, "منشور", "Publié"),
    suspended: tr(l, "موقوف", "Suspendu"),
  })[s];
export const qs = (q: Record<string, string>) => {
  const p = new URLSearchParams(Object.entries(q).filter(([, v]) => v));
  return p.size ? "?" + p : "";
};
export const nameOf = (items: Item[], slug: string, l: Locale) =>
  items.find((i) => i.slug === slug)?.[l] ?? slug;
