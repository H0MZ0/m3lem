"use server";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { access, catalog, locale, privileged, rpc } from "@/lib/server";
import { budget } from "@/lib/quota";
import { fail, val, type Outcome } from "@/lib/forms";
import { normalizePhone, tr } from "@/lib/model";

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

async function prepare(file: File) {
  const image = sharp(Buffer.from(await file.arrayBuffer()), {
    limitInputPixels: 24000000,
    failOn: "warning",
  });
  const meta = await image.metadata();
  if (
    !meta.format ||
    !["jpeg", "png", "webp"].includes(meta.format) ||
    (meta.pages ?? 1) > 1
  )
    throw new Error("image");
  return image
    .rotate()
    .resize({
      width: 1280,
      height: 1280,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
}

export async function submit(
  lang: string,
  _: Outcome,
  f: FormData,
): Promise<Outcome> {
  const l = locale(lang);
  // Bots that fill the hidden field get a normal-looking answer but no row.
  if (val(f, "website"))
    return {
      ok: true,
      message: tr(l, "تسجل الطلب.", "Demande enregistrée."),
    };
  const name = val(f, "name"),
    description = val(f, "description"),
    trade = val(f, "trade"),
    region = val(f, "region"),
    city = val(f, "city"),
    phone = normalizePhone(val(f, "phone")),
    items = await catalog();
  if (!items.some((i) => i.kind === "trade" && i.slug === trade && i.active))
    return {
      field: "trade",
      message: tr(
        l,
        "اختار حرفة من اللائحة.",
        "Choisissez un métier dans la liste.",
      ),
    };
  if (
    !items.some(
      (i) =>
        i.kind === "city" && i.slug === city && i.parent === region && i.active,
    )
  )
    return {
      field: "city",
      message: tr(
        l,
        "اختار مدينة من الجهة اللي حددتي.",
        "Choisissez une ville de la région sélectionnée.",
      ),
    };
  if (name.length < 2 || name.length > 80)
    return {
      field: "name",
      message: tr(
        l,
        "كتب سميتك (2 حتى 80 حرف).",
        "Indiquez votre nom (2 à 80 caractères).",
      ),
    };
  if (description.length < 10 || description.length > 1000)
    return {
      field: "description",
      message: tr(
        l,
        "شرح المشكل فـ10 حتى 1000 حرف.",
        "Décrivez le problème en 10 à 1 000 caractères.",
      ),
    };
  if (!phone)
    return {
      field: "phone",
      message: tr(
        l,
        "دخل نمرة مغربية صحيحة.",
        "Entrez un numéro marocain valide.",
      ),
    };
  if (!f.has("consent"))
    return {
      field: "consent",
      message: tr(
        l,
        "خاصك توافق باش نشاركو نمرتك مع الحرفيين المطابقين.",
        "Vous devez accepter le partage du numéro avec les artisans correspondants.",
      ),
    };
  const files = f
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length > 3)
    return {
      field: "photos",
      message: tr(l, "زيد 3 تصاور كحد أقصى.", "Trois photos maximum."),
    };
  if (files.reduce((n, file) => n + file.size, 0) > 5 * 1024 * 1024)
    return {
      field: "photos",
      message: tr(
        l,
        "المجموع ديال التصاور خاصو يبقى تحت 5 MiB.",
        "Le total des photos doit rester sous 5 Mio.",
      ),
    };
  if (
    files.some(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024,
    )
  )
    return {
      field: "photos",
      message: tr(
        l,
        "اختار JPEG، PNG ولا WebP، كل تصويرة تحت 5 MiB.",
        "Choisissez des JPEG, PNG ou WebP de 5 Mio maximum chacun.",
      ),
    };
  if (!(await budget("request", 5)))
    return {
      message: tr(
        l,
        "باراكا دابا، عاود من بعد ساعة.",
        "Limite atteinte, réessayez dans une heure.",
      ),
    };
  let images: { asset: string; data: Buffer }[];
  try {
    images = await Promise.all(
      files.map(async (file) => ({
        asset: randomUUID(),
        data: await prepare(file),
      })),
    );
  } catch {
    return {
      field: "photos",
      message: tr(
        l,
        "تصويرة ما صلاحاتش. جرّب JPEG ولا PNG عادية.",
        "Une photo est illisible. Essayez un JPEG ou PNG standard.",
      ),
    };
  }
  const bucket = privileged().storage.from("request-media"),
    uploaded: string[] = [];
  for (const image of images) {
    const { error } = await bucket.upload(image.asset + ".webp", image.data, {
      contentType: "image/webp",
      cacheControl: "0",
      upsert: false,
    });
    if (error) {
      if (uploaded.length)
        await bucket.remove(uploaded.map((id) => id + ".webp"));
      return {
        message: tr(
          l,
          "ما قدرناش نخزنو التصاور. عاود جرّب بلا تصاور ولا بتصويرة أصغر.",
          "Impossible d’enregistrer les photos. Réessayez sans photo ou avec un fichier plus petit.",
        ),
      };
    }
    uploaded.push(image.asset);
  }
  const token = randomBytes(32).toString("hex"),
    ref = randomBytes(5).toString("hex").toUpperCase();
  try {
    await rpc(
      "create_request",
      {
        body: {
          ref,
          trade,
          city,
          name,
          phone,
          description,
          consent: true,
        },
        token_hash: tokenHash(token),
        photos: images.map((image) => image.asset),
      },
      true,
    );
  } catch {
    if (uploaded.length)
      await bucket.remove(uploaded.map((id) => id + ".webp"));
    return fail(l);
  }
  redirect(`/${l}/request/${token}`);
}

export async function closeRequest(
  lang: string,
  token: string,
  _: Outcome,
): Promise<Outcome> {
  void _;
  const l = locale(lang);
  if (!/^[0-9a-f]{64}$/.test(token)) return fail(l);
  try {
    await rpc("close_request", { token_hash: tokenHash(token) }, true);
  } catch {
    return fail(l);
  }
  revalidatePath(`/${l}/request/${token}`);
  return {
    ok: true,
    message: tr(l, "تسد الطلب.", "Demande clôturée."),
  };
}

export async function respond(
  lang: string,
  request: string,
  _: Outcome,
): Promise<Outcome> {
  void _;
  const l = locale(lang);
  await access(l);
  try {
    await rpc("respond_request", { target: request });
  } catch {
    return fail(l);
  }
  revalidatePath(`/${l}/workspace`);
  return {
    ok: true,
    message: tr(
      l,
      "تسجل التواصل. عيّط ولا صيفط واتساب باش توصل للزبون.",
      "Contact enregistré. Appelez ou envoyez un WhatsApp au client.",
    ),
  };
}

export async function triageRequest(
  lang: string,
  target: string,
  _: Outcome,
  f: FormData,
): Promise<Outcome> {
  const l = locale(lang);
  await access(l, true);
  const decision = val(f, "decision");
  let assets: string[] = [];
  try {
    assets = await rpc<string[]>("triage_request", { target, decision });
  } catch {
    return fail(l);
  }
  if (decision === "remove" && assets.length)
    await privileged()
      .storage.from("request-media")
      .remove(assets.map((id) => id + ".webp"));
  revalidatePath(`/${l}/admin`);
  return {
    ok: true,
    message:
      decision === "remove"
        ? tr(l, "تحيد الطلب والتصاور ديالو.", "Demande et photos retirées.")
        : tr(l, "تسد الطلب.", "Demande clôturée."),
  };
}
