import type { Locale } from "./model";
import { tr } from "./model";
export type Outcome = {
  message?: string;
  link?: string;
  ok?: boolean;
  field?: string;
};
export type Mutation = (old: Outcome, data: FormData) => Promise<Outcome>;
export const val = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export const list = (f: FormData, k: string) => f.getAll(k).map(String);
export const fail = (l: Locale) => ({
  ok: false,
  message: tr(
    l,
    "راجع المعلومات وعاود جرّب. إلا تبدلات الصفحة، عاود حمّلها.",
    "Vérifiez les champs et réessayez. Si les données ont changé, rechargez la page.",
  ),
});
export const done = (l: Locale) => ({
  ok: true,
  message: tr(l, "تسجّل بنجاح.", "Enregistré."),
});
