import { client, locale } from "@/lib/server";
import { redirect } from "next/navigation";
import { tr } from "@/lib/model";
import { ActionForm } from "@/features/accounts/form";
import { changePassword } from "@/features/accounts/actions";
export default async function Reset({
  params,
}: PageProps<"/[lang]/account/reset">) {
  const l = locale((await params).lang);
  if (!(await (await client()).auth.getUser()).data.user)
    redirect(`/${l}/account/forgot?expired=1`);
  return (
    <section className="narrow">
      <h1>{tr(l, "بدّل كلمة السر", "Choisir un nouveau mot de passe")}</h1>
      <ActionForm action={changePassword.bind(null, l)} className="panel stack">
        <label>
          {tr(l, "كلمة السر الجديدة", "Nouveau mot de passe")}
          <input
            autoComplete="new-password"
            type="password"
            name="password"
            required
            minLength={8}
            maxLength={256}
          />
        </label>
        <label>
          {tr(l, "عاود كلمة السر", "Confirmer le mot de passe")}
          <input
            autoComplete="new-password"
            type="password"
            name="confirm"
            required
            minLength={8}
            maxLength={256}
          />
        </label>
        <button>{tr(l, "حفظ كلمة السر", "Enregistrer le mot de passe")}</button>
      </ActionForm>
    </section>
  );
}
