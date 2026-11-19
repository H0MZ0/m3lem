import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import sharp from "sharp";
const env = process.env;
const local = (s) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(s).hostname);
if (
  env.LOCAL_DEMO !== "1" ||
  ![env.SITE_URL, env.NEXT_PUBLIC_SUPABASE_URL, env.LOCAL_DATABASE_URL].every(
    local,
  )
)
  throw Error("Seed requires explicit LOCAL_DEMO and three loopback URLs");
const db = postgres(env.LOCAL_DATABASE_URL, { max: 1 });
try {
  if ((await db`select id from directory.profiles limit 1`).length)
    throw Error("Seed expects an empty directory. Use a fresh local database.");
  const auth = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  for (const name of ["staff", "artisan1", "artisan2", "artisan3"]) {
    const { error } = await auth.auth.admin.createUser({
      email: `${name}@m3lem.example`,
      password: "Atelier-local-2026!",
      email_confirm: true,
    });
    if (error && error.code !== "email_exists") throw error;
  }
  const asset = "40000000-0000-4000-8000-000000000001";
  const bucket = auth.storage.from("portfolio");
  const { error: uploadError } = await bucket.upload(
    asset + ".webp",
    await sharp(await readFile(new URL("fixture-art.svg", import.meta.url)))
      .webp()
      .toBuffer(),
    { contentType: "image/webp", upsert: true, cacheControl: "0" },
  );
  if (uploadError) throw uploadError;
  try {
    await db.begin(async (tx) => {
      const preview = await bucket.upload(
        asset + ".small.webp",
        await sharp(await readFile(new URL("fixture-art.svg", import.meta.url)))
          .resize(480)
          .webp()
          .toBuffer(),
        { contentType: "image/webp", upsert: true, cacheControl: "0" },
      );
      if (preview.error) throw preview.error;
      for (const file of ["catalog.sql", "demo.sql"])
        await tx.unsafe(await readFile(new URL(file, import.meta.url), "utf8"));
      await tx`insert into directory.media select ${asset}::uuid,id from directory.profiles where demo and id='10000000-0000-4000-8000-000000000001'`;
      await tx`insert into directory.gallery select live,${asset}::uuid,1 from directory.profiles where demo and id='10000000-0000-4000-8000-000000000001'`;
    });
  } catch (error) {
    await bucket.remove([asset + ".webp", asset + ".small.webp"]);
    throw error;
  }
  console.log("Local synthetic directory ready.");
} finally {
  await db.end();
}
