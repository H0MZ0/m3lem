"use server";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { access, locale, rpc, site } from "@/lib/server";
import { done, fail, val, type Outcome } from "@/lib/forms";
import { tr, uuid } from "@/lib/model";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
async function budget(scope: string, max: number) {
  const h = process.env.TRUSTED_CLIENT_IP_HEADER;
  const ip = (h && (await headers()).get(h)) || "shared";
  const client_key = createHmac(
    "sha256",
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
    .update(scope + ":" + ip)
    .digest("hex");
  return rpc<boolean>("take_quota", { client_key, max_hits: max }, true);
}
export async function report(
  lang: string,
  id: string,
  _: Outcome,
  f: FormData,
) {
  const l = locale(lang),
    reason = val(f, "reason");
  if (!uuid(id) || reason.length < 3 || reason.length > 500) return fail(l);
  try {
    if (!(await budget("report", 5)))
      return {
        message: tr(
          l,
          "باراكا دابا، عاود من بعد ساعة.",
          "Limite atteinte, réessayez dans une heure.",
        ),
      };
    await rpc("report_profile", { target: id, reason }, true);
  } catch {
    return fail(l);
  }
  return {
    ok: true,
    message: tr(
      l,
      "وصل التبليغ للإدارة.",
      "Le signalement a été transmis à l’équipe.",
    ),
  };
}
export async function review(
  lang: string,
  token: string,
  _: Outcome,
  f: FormData,
) {
  const l = locale(lang),
    stars = Number(val(f, "rating")),
    words = val(f, "comment");
  const invalid = {
    message: tr(
      l,
      "الرابط سالا، تستعمل، ولا ما بقاش متاح.",
      "Lien expiré, déjà utilisé ou indisponible.",
    ),
  };
  if (
    !/^[a-f0-9]{64}$/.test(token) ||
    !Number.isInteger(stars) ||
    stars < 1 ||
    stars > 5 ||
    words.length < 3 ||
    words.length > 500
  )
    return fail(l);
  try {
    if (!(await budget("review", 20))) return invalid;
    await rpc(
      "consume_invite",
      { token_hash: hash(token), stars, words },
      true,
    );
  } catch {
    return invalid;
  }
  return {
    ok: true,
    message: tr(
      l,
      "شكراً، الرأي ديالك تسيفط للمراجعة.",
      "Merci, votre avis est en modération.",
    ),
  };
}
export async function moderate(
  lang: string,
  target: string,
  expected: string,
  _: Outcome,
  f: FormData,
) {
  const l = locale(lang);
  await access(l, true);
  try {
    await rpc("moderate", {
      target,
      expected,
      decision: val(f, "decision"),
      note: val(f, "note"),
    });
  } catch {
    return fail(l);
  }
  revalidatePath(`/${l}/admin`);
  return done(l);
}
export async function catalogSave(lang: string, _: Outcome, f: FormData) {
  const l = locale(lang);
  await access(l, true);
  try {
    await rpc("manage_catalog", {
      body: {
        ...Object.fromEntries(
          ["slug", "kind", "parent", "ar", "fr"].map((k) => [k, val(f, k)]),
        ),
        aliases: val(f, "aliases")
          .split(/[,،]/)
          .map((v) => v.trim())
          .filter(Boolean),
        active: f.has("active"),
      },
    });
  } catch {
    return fail(l);
  }
  revalidatePath(`/${l}/admin`);
  return done(l);
}
export async function issue(
  lang: string,
  target: string,
  _: Outcome,
  f: FormData,
) {
  const l = locale(lang);
  await access(l, true);
  const token = randomBytes(32).toString("hex");
  try {
    await rpc("issue_invite", {
      target,
      evidence: val(f, "evidence"),
      token_hash: hash(token),
    });
  } catch {
    return fail(l);
  }
  return {
    ok: true,
    message: tr(
      l,
      "نسخ الرابط وشاركو غير مع الزبون. صالح 7 أيام.",
      "Copiez le lien et partagez-le uniquement avec le client. Valable 7 jours.",
    ),
    link: site().origin + `/${l}/review/${token}`,
  };
}
export async function triage(
  lang: string,
  target: string,
  _: Outcome,
  f: FormData,
) {
  const l = locale(lang);
  await access(l, true);
  try {
    await rpc("triage", { target, decision: val(f, "decision") });
  } catch {
    return fail(l);
  }
  revalidatePath(`/${l}/admin`);
  return done(l);
}
