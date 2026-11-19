import { locale } from "@/lib/server";
import { tr } from "@/lib/model";
import { ActionForm } from "@/features/accounts/form";
import { requestRecovery } from "@/features/accounts/actions";
export default async function Forgot({
  params,
  searchParams,
}: PageProps<"/[lang]/account/forgot">) {
  const l = locale((await params).lang);
  return (
    <section className="narrow">
      <h1>{tr(l, "رجّع حسابك", "Récupérer votre compte")}</h1>
      {(await searchParams).expired && (
        <p role="alert">
          {tr(
            l,
            "الرابط سالا ولا ما صالحش. طلب رابط جديد.",
            "Lien expiré ou invalide. Demandez un nouveau lien.",
          )}
        </p>
      )}
      <ActionForm
        action={requestRecovery.bind(null, l)}
        className="panel stack"
      >
        <label>
          {tr(l, "الإيميل ديال الحساب", "Adresse e-mail du compte")}
          <input
            required
            type="email"
            autoComplete="email"
            name="email"
            dir="ltr"
          />
        </label>
        <button>{tr(l, "صيفط ليا الرابط", "Envoyer le lien")}</button>
      </ActionForm>
      <a href={`/${l}/account`}>
        {tr(l, "رجع للدخول", "Retour à la connexion")}
      </a>
    </section>
  );
}
