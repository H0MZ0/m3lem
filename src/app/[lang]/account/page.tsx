import { locale } from "@/lib/server";
import { tr } from "@/lib/model";
import { ActionForm } from "@/features/accounts/form";
import { authenticate } from "@/features/accounts/actions";
export default async function Account({
  params,
  searchParams,
}: PageProps<"/[lang]/account">) {
  const l = locale((await params).lang);
  return (
    <section className="narrow">
      <h1>{tr(l, "حساب المعلّم", "Compte artisan")}</h1>
      <p>
        {tr(
          l,
          "الإيميل ديال الدخول كيبقى خاص.",
          "Votre adresse de connexion reste privée.",
        )}
      </p>
      {(await searchParams).expired && (
        <p role="alert">
          {tr(l, "الرابط سالا. عاود دخل.", "Lien expiré. Reconnectez-vous.")}
        </p>
      )}
      {(await searchParams).changed && (
        <p role="status" className="notice">
          {tr(
            l,
            "تبدلات كلمة السر. دخل بالكلمة الجديدة.",
            "Mot de passe modifié. Connectez-vous avec le nouveau mot de passe.",
          )}
        </p>
      )}
      <ActionForm action={authenticate.bind(null, l)} className="panel stack">
        <label>
          {tr(l, "الإيميل", "Adresse e-mail")}
          <input
            type="email"
            dir="ltr"
            autoComplete="email"
            name="email"
            required
          />
        </label>
        <label>
          {tr(
            l,
            "كلمة السر (8 حروف على الأقل)",
            "Mot de passe (8 caractères minimum)",
          )}
          <input
            type="password"
            autoComplete="current-password"
            minLength={8}
            maxLength={256}
            name="password"
            required
          />
        </label>
        <div className="buttons">
          <button name="mode" value="login">
            {tr(l, "دخل", "Se connecter")}
          </button>
          <button className="alt" name="mode" value="signup">
            {tr(l, "فتح حساب", "Créer un compte")}
          </button>
        </div>
      </ActionForm>
      <p>
        <a href={`/${l}/account/forgot`}>
          {tr(l, "نسيت كلمة السر؟", "Mot de passe oublié ?")}
        </a>
      </p>
    </section>
  );
}
