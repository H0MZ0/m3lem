import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
const pw = "Atelier-local-2026!",
  pid = "10000000-0000-4000-8000-000000000001";
const api = (privileged = false) =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    privileged
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
test.beforeAll(async () => {
  const c = api();
  const { error } = await c.auth.signInWithPassword({
    email: "artisan1@m3lem.example",
    password: pw,
  });
  if (error) throw error;
  const refreshed = await c.rpc("set_available", { yes: true });
  if (refreshed.error) throw refreshed.error;
});
test("Supabase HTTP roles hide the staff queue, reports, drafts and private storage", async () => {
  const anon = api(),
    owner = api();
  await owner.auth.signInWithPassword({
    email: "artisan2@m3lem.example",
    password: pw,
  });
  for (const c of [anon, owner]) {
    expect((await c.rpc("staff_queue")).error).toBeTruthy();
    expect(
      (
        await c.rpc("report_profile", {
          target: pid,
          reason: "Unauthorized direct RPC",
        })
      ).error,
    ).toBeTruthy();
    expect(
      (await c.schema("directory").from("reports").select("*")).error,
    ).toBeTruthy();
  }
  const { data } = await anon.rpc("artisan_detail", {
    target: pid,
    show_demo: true,
  });
  expect(data.phone).toBeNull();
  expect(data.owner_id).toBeUndefined();
  expect((await anon.rpc("artisan_detail", { target: pid })).data).toBeNull();
  expect(
    (await anon.storage.from("portfolio").download(data.gallery[0] + ".webp"))
      .error,
  ).toBeTruthy();
});
async function login(p: Page, email: string, signup = false) {
  await p.goto("/fr/account");
  await p.getByLabel("Adresse e-mail").fill(email);
  await p.getByLabel("Mot de passe").fill(pw);
  await p
    .getByRole("button", { name: signup ? "Créer un compte" : "Se connecter" })
    .click();
  await expect(p).toHaveURL(/\/fr\/workspace$/);
}
test("staff can maintain a trade alias and archive its directory without losing references", async ({
  page,
}) => {
  const c = api();
  await c.auth.signInWithPassword({
    email: "staff@m3lem.example",
    password: pw,
  });
  const rows = await c.rpc("catalog_items", { include_inactive: true });
  const original = (rows.data as { slug: string; aliases: string[] }[]).find(
    (i) => i.slug === "peinture",
  )!;
  try {
    await login(page, "staff@m3lem.example");
    await page.goto("/fr/admin");
    await page.getByLabel("Entrée à modifier").selectOption("peinture");
    const editor = page.locator("details").filter({
      has: page.locator("summary", { hasText: "Peinture · peinture" }),
    });
    await editor.locator("summary").click();
    await editor
      .locator("[name=aliases]")
      .fill([...original.aliases, "rouleau-test"].join(", "));
    await editor.getByRole("button", { name: "Enregistrer" }).click();
    await expect(editor.getByRole("status")).toHaveText("Enregistré.");
    await page.goto("/fr/search?q=rouleau-test&city=casablanca");
    await expect(page).toHaveURL(/\/city\/casablanca\/peinture$/);
    await expect(
      page.getByRole("link", { name: /Atelier Tine/ }),
    ).toBeVisible();
    await page.goto("/fr/admin");
    await page.getByLabel("Entrée à modifier").selectOption("peinture");
    await editor.locator("summary").click();
    await editor.getByLabel("Actif").uncheck();
    await editor.getByRole("button", { name: "Enregistrer" }).click();
    await expect(editor.locator("summary")).toContainText("(−)");
    expect(
      (
        await api().rpc("artisan_detail", {
          target: "10000000-0000-4000-8000-000000000003",
          show_demo: true,
        })
      ).data,
    ).toBeNull();
  } finally {
    const restore = await c.rpc("manage_catalog", { body: original });
    if (restore.error) throw restore.error;
  }
});
test("region first on mobile, city-only links, French switch and keyboard navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.keyboard.press("Tab");
  await expect(page.getByText("دوز للمحتوى")).toBeFocused();
  await page.locator("[name=q]").fill("الما كيتسرب");
  const region = page.locator("[name=region]"),
    city = page.locator("[name=city]");
  await expect(region.locator("option")).toHaveCount(13);
  await expect(city).toBeDisabled();
  await expect(page.locator("[name=area]")).toHaveCount(0);
  await region.selectOption("region-01");
  await city.selectOption("tanger");
  await expect(city.locator('option[value="casablanca"]')).toHaveCount(0);
  await region.selectOption("region-06");
  await expect(city).toHaveValue("");
  await expect(city.locator('option[value="tanger"]')).toHaveCount(0);
  await city.selectOption("casablanca");
  await page.locator("[name=today]").check();
  await page.getByRole("link", { name: "Français" }).click();
  await expect(page.locator("[name=q]")).toHaveValue("الما كيتسرب");
  await expect(page.locator("[name=today]")).toBeChecked();
  await expect(city).toHaveValue("casablanca");
  await page
    .locator(".shortcuts a")
    .filter({ hasText: "Plomberie" })
    .first()
    .click();
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article .contact").first()).toBeInViewport();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page).toHaveURL(/fr\/city\/casablanca\/plomberie\?today=1$/);
  await page.getByRole("link", { name: /Atelier Nila/ }).click();
  await expect(
    page.getByRole("button", { name: "Appeler · démo" }),
  ).toBeDisabled();
  await expect(
    page.locator('a[href^="tel:"],a[href^="https://wa.me/"]'),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Retour aux résultats" }).click();
  await expect(page).toHaveURL(/plomberie\?today=1$/);
  await page.getByText("Modifier la recherche", { exact: true }).click();
  await expect(region).toHaveValue("region-06");
  await expect(city).toHaveValue("casablanca");
  await page.locator("[name=q]").fill("peintre");
  await region.selectOption("region-12");
  await city.selectOption("dakhla");
  await page.locator("[name=today]").uncheck();
  await page.getByRole("button", { name: "Trouver un artisan" }).click();
  await expect(
    page.getByText(/Aucun artisan ne correspond à ces critères/),
  ).toBeVisible();
  await page.goto("/fr/city/casablanca/peinture?area=sidi-maarouf");
  await expect(page).toHaveURL(/\/casablanca\/peinture$/);
  await expect(page.getByRole("link", { name: /Atelier Tine/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("restored page drops yesterday’s badge at Casablanca midnight", async ({
  page,
}) => {
  const { data } = await api().rpc("artisan_detail", {
    target: pid,
    show_demo: true,
  });
  const end = new Date(data.expires_at).getTime();
  await page.clock.install({ time: new Date(end - 4000) });
  await page.goto(`/fr/p/${pid}`);
  await expect(page.locator(".badge")).toBeVisible();
  await page.clock.fastForward(5000);
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(page.locator(".badge")).toHaveCount(0);
});
test("desktop: signup, private upload, moderation, report, review and suspension", async ({
  browser,
  page,
}) => {
  const staff = await browser.newContext({ baseURL: process.env.SITE_URL }),
    visitor = await browser.newContext({ baseURL: process.env.SITE_URL }),
    admin = await staff.newPage(),
    publicPage = await visitor.newPage();
  const suffix = randomUUID().slice(0, 8),
    email = `smoke-${suffix}@m3lem.example`,
    name = `Atelier test ${suffix}`,
    service = api(true),
    owner = api();
  let user = "",
    asset = "";
  try {
    await login(page, email, true);
    const session = await owner.auth.signInWithPassword({
      email,
      password: pw,
    });
    user = session.data.user!.id;
    await page.getByLabel("Nom public").fill(name);
    await page
      .getByLabel("Services proposés")
      .fill("Réparation de fuites dans le quartier.");
    await page.getByLabel("Plomberie", { exact: true }).check();
    await page.getByLabel("Rechercher un métier").fill("nejjar");
    await page.getByLabel("Menuiserie bois", { exact: true }).check();
    await page
      .getByRole("combobox", { name: "Région", exact: true })
      .selectOption("region-01");
    await page
      .getByRole("combobox", { name: "Ville", exact: true })
      .selectOption("tanger");
    await expect(page.locator("select[name=city]")).toHaveValue("tanger");
    await page.getByLabel("Téléphone public").fill("0600000000");
    await page.getByLabel(/J’accepte la publication/).check();
    await page.getByLabel("Téléphone public").fill("111");
    await page
      .getByRole("button", { name: "Enregistrer le brouillon" })
      .click();
    await expect(page.getByText(/numéro marocain valide/)).toBeVisible();
    await expect(page.getByLabel("Nom public")).toHaveValue(name);
    await expect(page.getByLabel("Services proposés")).toHaveValue(
      "Réparation de fuites dans le quartier.",
    );
    await expect(page.getByLabel("Téléphone public")).toBeFocused();
    await page.getByLabel("Téléphone public").fill("0600000000");
    await page
      .getByRole("button", { name: "Enregistrer le brouillon" })
      .click();
    await expect(page.locator("aside.notice")).toContainText("Brouillon");
    await page.getByRole("link", { name: "Mes photos" }).click();
    await expect(page.locator("[name=image]")).toBeVisible();
    const w = (await owner.rpc("my_workspace")).data;
    expect(w.revision.trades.sort()).toEqual(["menuiserie", "plomberie"]);
    await expect(publicPage.goto(`/fr/p/${w.id}`)).resolves.toBeTruthy();
    await expect(publicPage.getByRole("heading", { name: name })).toHaveCount(
      0,
    );
    await page.locator("[name=image]").setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    });
    await page.getByRole("button", { name: "Importer la photo" }).click();
    await expect(
      page.getByText(/Les photos existantes sont conservées/),
    ).toBeVisible();
    const pixel = await sharp({
      create: { width: 48, height: 48, channels: 3, background: "#b76c4f" },
    })
      .png()
      .toBuffer();
    await page
      .locator("[name=image]")
      .setInputFiles({ name: "mur.png", mimeType: "image/png", buffer: pixel });
    await page.getByRole("button", { name: "Importer la photo" }).click();
    await expect(page.getByLabel("Afficher la photo 1")).toBeVisible();
    asset = (await owner.rpc("my_workspace")).data.assets[0];
    expect((await publicPage.request.get(`/media/${asset}`)).status()).toBe(
      404,
    );
    expect(
      (
        await api()
          .storage.from("portfolio")
          .download(asset + ".webp")
      ).error,
    ).toBeTruthy();
    await page.getByLabel("Afficher la photo 1").check();
    await page.getByRole("button", { name: "Envoyer en révision" }).click();
    await expect(page.locator("aside.notice")).toContainText("En révision");
    await page.goto("/fr/admin");
    await expect(
      page.getByRole("heading", { name: "Administration" }),
    ).toHaveCount(0);
    await login(admin, "staff@m3lem.example");
    await admin.getByRole("link", { name: "Ouvrir l’administration" }).click();
    let panel = admin
      .locator("details.panel")
      .filter({ has: admin.locator("summary", { hasText: name }) });
    await panel.locator("summary").click();
    await panel.getByRole("button", { name: "Approuver et publier" }).click();
    await expect(panel.locator("summary")).toContainText("Publié");
    await publicPage.goto("/fr/search?city=tanger&q=nejjar");
    await expect(publicPage).toHaveURL(/\/fr\/city\/tanger\/menuiserie$/);
    await publicPage.getByRole("link", { name }).click();
    await expect(
      publicPage.getByText("Pas encore d’avis", { exact: true }),
    ).toBeVisible();
    expect((await publicPage.request.get(`/media/${asset}`)).status()).toBe(
      200,
    );
    await page.goto("/fr/workspace");
    await page
      .getByRole("button", { name: "Confirmer pour aujourd’hui" })
      .click();
    await expect(page.getByText(/Dernière confirmation/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Voir ma fiche publique" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ma fiche", exact: true }).click();
    await page.getByLabel("Nom public").fill(name + " modifié");
    await page.getByRole("button", { name: "Envoyer en révision" }).click();
    await expect(page.locator("aside.notice")).toContainText("En révision");
    await publicPage.reload();
    await expect(
      publicPage.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await publicPage.getByText("Signaler un problème", { exact: true }).click();
    await publicPage.locator("[name=reason]").fill("Test de contact " + suffix);
    await publicPage
      .getByRole("button", { name: "Envoyer le signalement" })
      .click();
    await expect(publicPage.getByText(/transmis à l’équipe/)).toBeVisible();
    await admin.reload();
    panel = admin
      .locator("details.panel")
      .filter({ has: admin.locator("summary", { hasText: name }) });
    await panel.locator("summary").click();
    await expect(panel.locator(".revision-diff")).toContainText(
      name + " modifié",
    );
    await panel.getByRole("button", { name: "Approuver et publier" }).click();
    await expect(panel.locator("summary")).toContainText("Publié");
    await admin
      .locator("form")
      .filter({ hasText: "Test de contact " + suffix })
      .getByRole("button", { name: "Clore le signalement" })
      .click();
    await expect(admin.getByText("Test de contact " + suffix)).toHaveCount(0);
    if (!(await panel.locator("[name=evidence]").isVisible()))
      await panel.locator("summary").click();
    await panel
      .getByLabel("Preuve documentée de fin d’intervention")
      .fill("Client appelé après le travail de test.");
    await panel.getByRole("button", { name: "Émettre un lien d’avis" }).click();
    const link = await panel.locator(".invite").getAttribute("href");
    await publicPage.goto(link!);
    await expect(publicPage.getByRole("heading", { level: 1 })).toContainText(
      name + " modifié",
    );
    await publicPage.getByLabel("Note sur 5").selectOption("5");
    await publicPage.getByLabel("Votre avis").fill("Travail précis " + suffix);
    await publicPage.getByRole("button", { name: "Envoyer l’avis" }).click();
    await expect(publicPage.getByText(/avis est en modération/)).toBeVisible();
    await publicPage.reload();
    await expect(publicPage.getByText(/déjà utilisé/)).toBeVisible();
    await admin.reload();
    await admin
      .locator("form")
      .filter({ hasText: "Travail précis " + suffix })
      .getByRole("button", { name: "Publier l’avis" })
      .click();
    await expect(admin.getByText("Travail précis " + suffix)).toHaveCount(0);
    await publicPage.goto(`/fr/p/${w.id}`);
    await expect(
      publicPage.getByText("Travail précis " + suffix),
    ).toBeVisible();
    await panel.locator("summary").click();
    await panel.locator("[name=note]").fill("Contact à vérifier");
    await panel.getByRole("button", { name: "Suspendre" }).click();
    await expect(panel.locator("summary")).toContainText("Suspendu");
    await publicPage.goto("/fr/city/tanger/menuiserie");
    await expect(
      publicPage.getByRole("link", { name: new RegExp(suffix) }),
    ).toHaveCount(0);
    expect((await publicPage.request.get(`/media/${asset}`)).status()).toBe(
      404,
    );
    await page.goto("/fr/workspace");
    await page.getByRole("button", { name: "Déconnexion" }).click();
    await page.goto("/fr/workspace");
    await expect(page).toHaveURL(/\/account$/);
  } finally {
    if (asset)
      await service.storage
        .from("portfolio")
        .remove([asset + ".webp", asset + ".small.webp"]);
    if (user) await service.auth.admin.deleteUser(user);
    await staff.close();
    await visitor.close();
  }
});
