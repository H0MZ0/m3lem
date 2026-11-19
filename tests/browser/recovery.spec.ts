import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

test("recover with the email sent to the local mailbox and sign in with the new password", async ({
  page,
  request,
}) => {
  const mailbox = "http://127.0.0.1:54324",
    email = `recover-${randomUUID()}@m3lem.example`,
    old = "Local-before-123!",
    password = "Local-after-456!";
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const account = await admin.auth.admin.createUser({
    email,
    password: old,
    email_confirm: true,
  });
  if (account.error) throw account.error;
  try {
    await page.goto("/fr/account");
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await page.getByLabel("Adresse e-mail du compte").fill(email);
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(page.getByRole("status")).toContainText("Si un compte");
    let id = "";
    await expect
      .poll(
        async () => {
          const inbox = await request.get(`${mailbox}/api/v1/search`, {
            params: { query: `to:${email}` },
          });
          if (!inbox.ok()) return false;
          id = (await inbox.json()).messages?.[0]?.ID ?? "";
          return Boolean(id);
        },
        { timeout: 15000 },
      )
      .toBe(true);
    const mail = await (
      await request.get(`${mailbox}/api/v1/message/${id}`)
    ).json();
    const link = await page.evaluate(
      (html) =>
        new DOMParser()
          .parseFromString(html, "text/html")
          .querySelector("a")
          ?.getAttribute("href"),
      mail.HTML,
    );
    expect(link).toBeTruthy();
    const u = new URL(link!);
    expect(["127.0.0.1", "localhost"]).toContain(u.hostname);
    await page.goto(u.href);
    await expect(page).toHaveURL(/\/fr\/account\/reset$/);
    await page.getByLabel("Nouveau mot de passe").fill(password);
    await page.getByLabel("Confirmer le mot de passe").fill(password);
    await page
      .getByRole("button", { name: "Enregistrer le mot de passe" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Mot de passe modifié",
    );
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.locator("[name=password]").fill(password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/fr\/workspace$/);
  } finally {
    await admin.auth.admin.deleteUser(account.data.user.id);
  }
});
