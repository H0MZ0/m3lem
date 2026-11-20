import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  if (!req.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return res;
  const c = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll(list, headers) {
          for (const v of list) req.cookies.set(v.name, v.value);
          res = NextResponse.next({ request: req });
          for (const v of list) res.cookies.set(v.name, v.value, v.options);
          for (const [k, v] of Object.entries(headers ?? {}))
            res.headers.set(k, v);
        },
      },
    },
  );
  await c.auth.getClaims();
  return res;
}
export const config = {
  matcher: [
    "/ar/:path*",
    "/fr/:path*",
    "/media/:path*",
    "/request-media/:path*",
  ],
};
