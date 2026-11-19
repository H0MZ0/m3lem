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
