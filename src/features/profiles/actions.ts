"use server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { access, locale, rpc, privileged, catalog } from "@/lib/server";
import { normalizePhone, tr, type Workspace } from "@/lib/model";
import { done, fail, list, val, type Outcome } from "@/lib/forms";
export async function save(
  lang: string,
  _: Outcome,
  f: FormData,
): Promise<Outcome> {
  const l = locale(lang);
  await access(l);
  const phone = normalizePhone(val(f, "phone")),
    fee = val(f, "fee");
  if (!phone)
    return {
      message: tr(
        l,
        "دخل نمرة مغربية صحيحة.",
        "Entrez un numéro marocain valide.",
      ),
    };
  if (fee && !/^\d{1,6}$/.test(fee)) return fail(l);
  if (!list(f, "trades").length)
    return {
      message: tr(l, "اختار شي حرفة.", "Sélectionnez au moins un métier."),
    };
  if (val(f, "mode") === "submit" && !f.has("consent"))
    return {
      message: tr(
        l,
        "الموافقة على نشر النمرة ضرورية للمراجعة.",
        "Le consentement à publier le numéro est requis pour soumettre la fiche.",
      ),
    };
  const gallery = list(f, "media")
    .map((id) => [id, Number(val(f, "order:" + id))] as const)
    .sort((a, b) => a[1] - b[1]);
  if (
    gallery.length > 8 ||
    new Set(gallery.map((x) => x[1])).size !== gallery.length ||
    gallery.some((x) => !Number.isInteger(x[1]) || x[1] < 1 || x[1] > 8)
  )
    return {
      message: tr(
        l,
        "عطي لكل صورة مختارة ترتيب مختلف من 1 حتى 8.",
        "Attribuez à chaque photo sélectionnée un rang distinct de 1 à 8.",
      ),
    };
  try {
    if (
      !(await catalog()).some(
        (i) =>
          i.kind === "city" &&
          i.slug === val(f, "city") &&
          i.parent === val(f, "region"),
      )
    )
      return {
        message: tr(
          l,
          "اختار مدينة من الجهة اللي حددتي.",
          "Choisissez une ville de la région sélectionnée.",
        ),
      };
    await rpc("save_profile", {
      body: {
        base: val(f, "base"),
        name: val(f, "name"),
        services: val(f, "services"),
        city: val(f, "city"),
        trades: list(f, "trades"),
        phone,
        fee: fee ? Number(fee) : null,
        consent: f.has("consent"),
        whatsapp: f.has("whatsapp"),
        gallery: gallery.map((x) => x[0]),
      },
      submit: val(f, "mode") === "submit",
    });
  } catch {
    return fail(l);
  }
  revalidatePath(`/${l}/workspace`);
  return done(l);
}
export async function availability(lang: string, _: Outcome, f: FormData) {
  const l = locale(lang);
  await access(l);
  try {
    await rpc("set_available", { yes: val(f, "available") === "yes" });
  } catch {
    return fail(l);
  }
  revalidatePath(`/${l}/workspace`);
  return done(l);
}
export async function removeAsset(lang: string, asset: string) {
  const l = locale(lang);
  await access(l);
  const workspace = await rpc<Workspace | null>("my_workspace");
  if (!workspace?.assets.includes(asset)) return fail(l);
  try {
    await rpc("release_asset", { asset_id: asset });
  } catch {
    return {
      message: tr(
        l,
        "حيّد الصورة من النسخة المحفوظة والمنشورة قبل المسح.",
        "Retirez la photo de la fiche enregistrée et publiée avant de la supprimer.",
      ),
    };
  }
  await privileged()
    .storage.from("portfolio")
    .remove([asset + ".webp", asset + ".small.webp"]);
  revalidatePath(`/${l}/workspace`);
  return done(l);
}
export async function upload(lang: string, _: Outcome, f: FormData) {
  const l = locale(lang),
    uid = await access(l),
    file = f.get("image");
  const bad = {
    message: tr(
      l,
      "اختار JPEG، PNG ولا WebP أقل من 5 MiB. الصور القديمة باقين.",
      "Choisissez un JPEG, PNG ou WebP de 5 Mio maximum. Les photos existantes sont conservées.",
    ),
  };
  if (
    !(file instanceof File) ||
    !file.size ||
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    return bad;
  const w = await rpc<Workspace | null>("my_workspace");
  if (!w || w.state === "suspended" || w.assets.length >= 24) return fail(l);
  const asset = randomUUID(),
    bucket = privileged().storage.from("portfolio");
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 24000000,
        failOn: "warning",
      }),
      meta = await image.metadata();
    if (
      !meta.format ||
      !["jpeg", "png", "webp"].includes(meta.format) ||
      (meta.pages ?? 1) > 1
    )
      return bad;
    const data = await image
      .rotate()
      .resize({
        width: 1280,
        height: 1280,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
    const { error } = await bucket.upload(asset + ".webp", data, {
      contentType: "image/webp",
      cacheControl: "0",
      upsert: false,
    });
    if (error) return bad;
    try {
      const small = await sharp(data)
        .resize({
          width: 480,
          height: 480,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 74 })
        .toBuffer();
      const preview = await bucket.upload(asset + ".small.webp", small, {
        contentType: "image/webp",
        cacheControl: "0",
        upsert: false,
      });
      if (preview.error) throw preview.error;
      await rpc("register_asset", { account: uid, asset }, true);
    } catch {
      await bucket.remove([asset + ".webp", asset + ".small.webp"]);
      return bad;
    }
  } catch {
    return bad;
  }
  revalidatePath(`/${l}/workspace`);
  return done(l);
}
