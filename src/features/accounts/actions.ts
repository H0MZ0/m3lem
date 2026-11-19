"use server";
import { redirect } from "next/navigation";
import { client, locale, site } from "@/lib/server";
import { val, type Outcome } from "@/lib/forms";
import { tr } from "@/lib/model";
export async function authenticate(
  lang: string,
  _: Outcome,
  f: FormData,
): Promise<Outcome> {
  const l = locale(lang),
    email = val(f, "email"),
    password = String(f.get("password") ?? ""),
    signup = f.get("mode") === "signup";
  const invalid = {
    message: tr(
      l,
      "راجع الإيميل وكلمة السر وحاول من جديد.",
      "Vérifiez votre adresse et votre mot de passe, puis réessayez.",
    ),
  };
  if (
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    password.length < 8 ||
    password.length > 256
  )
    return invalid;
  const c = await client();
  const { data, error } = signup
    ? await c.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: site().origin + `/auth/callback?lang=${l}`,
        },
      })
    : await c.auth.signInWithPassword({ email, password });
  if (error) return invalid;
  if (!data.session)
    return {
      ok: true,
      message: tr(
        l,
        "شوف الإيميل باش تأكّد الحساب.",
        "Consultez votre messagerie pour confirmer votre compte.",
      ),
    };
  redirect(`/${l}/workspace`);
}
export async function signout(lang: string) {
  const l = locale(lang);
  await (await client()).auth.signOut();
  redirect(`/${l}`);
}
export async function requestRecovery(
  lang: string,
  _: Outcome,
  f: FormData,
): Promise<Outcome> {
  const l = locale(lang),
    email = val(f, "email");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254)
    return { message: tr(l, "دخل إيميل صحيح.", "Entrez une adresse valide.") };
  const { error } = await (
    await client()
  ).auth.resetPasswordForEmail(email, {
    redirectTo: site().origin + `/auth/callback?flow=recovery&lang=${l}`,
  });
  if (error) console.warn("Auth recovery request not accepted", error.status);
  return {
    ok: true,
    message: tr(
      l,
      "إلا كان عندك حساب بهاد الإيميل، شوف الرسائل باش تبدّل كلمة السر.",
      "Si un compte utilise cette adresse, consultez votre messagerie pour réinitialiser le mot de passe.",
    ),
  };
}
export async function changePassword(
  lang: string,
  _: Outcome,
  f: FormData,
): Promise<Outcome> {
  const l = locale(lang),
    password = String(f.get("password") ?? "");
  if (
    password.length < 8 ||
    password.length > 256 ||
    password !== String(f.get("confirm") ?? "")
  )
    return {
      message: tr(
        l,
        "خاص كلمتي السر يكونو بحال بحال وفيهم 8 حروف على الأقل.",
        "Les deux mots de passe doivent être identiques et contenir au moins 8 caractères.",
      ),
    };
  const c = await client(),
    { data } = await c.auth.getUser();
  if (!data.user) redirect(`/${l}/account/forgot?expired=1`);
  const { error } = await c.auth.updateUser({ password });
  if (error)
    return {
      message: tr(
        l,
        "تعذّر تبديل كلمة السر. جرّب كلمة أخرى أو طلب رابط جديد.",
        "Impossible de modifier le mot de passe. Essayez un autre mot de passe ou demandez un nouveau lien.",
      ),
    };
  await c.auth.signOut();
  redirect(`/${l}/account?changed=1`);
}
