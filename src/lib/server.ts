import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Locale, Item } from "./model";
export function locale(value: string): Locale {
  if (value !== "ar" && value !== "fr") notFound();
  return value;
}
export const site = () =>
  new URL(process.env.SITE_URL ?? "http://localhost:3000");
export function demo() {
  return (
    process.env.LOCAL_DEMO === "1" &&
    [site(), new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)].every((u) =>
      ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname),
    )
  );
}
export const client = cache(async () => {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(list) {
          try {
            for (const c of list) jar.set(c.name, c.value, c.options);
          } catch {
            /* Server Components: refresh handled by proxy. */
          }
        },
      },
    },
  );
});
export function privileged() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function rpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
  service = false,
): Promise<T> {
  const c = service ? privileged() : await client();
  const { data, error } = await c.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}
export const catalog = cache((all = false) =>
  rpc<Item[]>("catalog_items", { include_inactive: all }),
);
export async function access(l: Locale, staff = false) {
  const { data } = await (await client()).auth.getClaims();
  if (!data?.claims.sub) redirect(`/${l}/account`);
  if (staff && !(await rpc<boolean>("is_staff"))) notFound();
  return data.claims.sub;
}
