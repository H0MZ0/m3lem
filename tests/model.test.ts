import test from "node:test";
import assert from "node:assert/strict";
import {
  contacts,
  normalizePhone,
  resolveTrade,
  type Item,
} from "../src/lib/model";
test("Arabic variants, French accents and Latin aliases", () => {
  const item: Item = {
    kind: "trade",
    slug: "electricite",
    ar: "الضو",
    fr: "Électricité",
    aliases: ["إصلاح الضو", "تريسيان", "trisian"],
    active: true,
    parent: null,
  };
  for (const s of [
    " electricite ",
    "ELECTRICITÉ",
    "اصلاح الضو",
    "تْرِيسيان",
    "Trisian",
  ])
    assert.equal(resolveTrade([item], s), item.slug);
});
test("Moroccan contact channels, localized message and inert demos", () => {
  assert.equal(normalizePhone("00212 6 12 34 56 78"), "+212612345678");
  assert.equal(normalizePhone("001-1234"), null);
  const c = contacts("0612345678", true, false, "ar", "الضو", "المعاريف")!;
  assert.equal(c.tel, "tel:+212612345678");
  assert.match(c.wa!, /^https:\/\/wa.me\/212612345678\?text=%/);
  assert.match(new URL(c.wa!).searchParams.get("text")!, /الضو فـ المعاريف/);
  assert.equal(
    contacts(c.tel.slice(4), false, false, "fr", "Peinture", "Casa")?.wa,
    null,
  );
  assert.equal(contacts(c.tel.slice(4), true, true, "fr", "", ""), null);
});
