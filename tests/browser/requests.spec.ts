import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

const pw = "Atelier-local-2026!";
const api = (privileged = false) =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    privileged
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
async function login(p: Page, email: string) {
  await p.goto("/fr/account");
  await p.getByLabel("Adresse e-mail").fill(email);
  await p.getByLabel("Mot de passe").fill(pw);
  await p.getByRole("button", { name: "Se connecter" }).click();
  await expect(p).toHaveURL(/\/fr\/workspace$/);
}

test("a visitor sends a photo request; a matching artisan and staff handle it", async ({
  browser,
  page,
}) => {
  const suffix = randomUUID().slice(0, 8),
    name = `Client ${suffix}`,
    service = api(true),
    db = postgres(process.env.LOCAL_DATABASE_URL!, { max: 1 }),
    staff = await browser.newContext({ baseURL: process.env.SITE_URL }),
    artisan = await browser.newContext({ baseURL: process.env.SITE_URL }),
    admin = await staff.newPage(),
    worker = await artisan.newPage();
  let requestId = "",
    ref = "";
  try {
    await page.goto("/fr/request");
    await page.locator("[name=trade]").selectOption("plomberie");
    await page
      .getByRole("combobox", { name: "Région", exact: true })
      .selectOption("region-06");
    await page
      .getByRole("combobox", { name: "Ville", exact: true })
      .selectOption("casablanca");
    await page
      .getByLabel("Décrivez le problème")
      .fill(
        "Fuite sous l’évier de la cuisine, besoin d’un passage aujourd’hui.",
      );
    await page.getByLabel("Votre nom").fill(name);
    await page.getByLabel("Téléphone", { exact: true }).fill("0612345678");
    await page.getByLabel(/Photos/).setInputFiles({
      name: "fuite.png",
      mimeType: "image/png",
      buffer: await sharp({
        create: {
          width: 64,
          height: 48,
          channels: 3,
          background: "#b76c4f",
        },
      })
        .png()
        .toBuffer(),
    });
    await page.getByLabel(/J’accepte/).check();
    await page.getByRole("button", { name: "Envoyer la demande" }).click();
    await page.waitForURL(/\/fr\/request\/[0-9a-f]{64}$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Demande",
    );
    ref = await page.locator("h1 bdi").innerText();
    expect(ref).toMatch(/^[A-Z0-9]{10}$/);
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.locator('img[src^="/request-media/"]')).toHaveCount(1);
    await expect(page.getByText("Ouverte", { exact: true })).toBeVisible();
    const found = await db<
      { id: string }[]
    >`select id from directory.requests where ref=${ref}`;
    requestId = found[0].id;

    await login(worker, "artisan1@m3lem.example");
    await worker.goto("/fr/workspace?tab=requests");
    await expect(worker.getByText(name)).toBeVisible();
    await expect(worker.getByText("+212612345678")).toBeVisible();
    await worker.getByRole("button", { name: "J’ai contacté" }).click();
    await expect(
      worker.getByText("Contact enregistré", { exact: true }),
    ).toBeVisible();

    await login(admin, "staff@m3lem.example");
    await admin.goto("/fr/admin");
    const panel = admin
      .locator("details.panel")
      .filter({ has: admin.locator("summary", { hasText: name }) });
    await panel.locator("summary").click();
    await expect(panel.getByText("Contacts enregistrés")).toBeVisible();
    await panel.getByRole("button", { name: "Clore la demande" }).click();
    await expect(
      admin.locator("details.panel").filter({ hasText: name }),
    ).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("Clôturée", { exact: true })).toBeVisible();
    await expect(page.getByText(/Cette demande est clôturée/)).toBeVisible();
  } finally {
    if (!requestId && ref) {
      const rows = await db<
        { id: string }[]
      >`select id from directory.requests where ref=${ref}`;
      requestId = rows[0]?.id ?? "";
    }
    if (requestId) {
      const photos = await db<
        { asset: string }[]
      >`select asset from directory.request_photos where request=${requestId}`;
      if (photos.length)
        await service.storage
          .from("request-media")
          .remove(photos.map((p) => p.asset + ".webp"));
      await db`delete from directory.requests where id=${requestId}`;
    }
    await db.end();
    await staff.close();
    await artisan.close();
  }
});
