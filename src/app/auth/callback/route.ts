import { NextRequest, NextResponse } from "next/server";
import { client, site } from "@/lib/server";
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams,
    l = p.get("lang") === "fr" ? "fr" : "ar",
    code = p.get("code");
  const c = await client(),
    recovery = p.get("flow") === "recovery",
    hash = p.get("token_hash");
  const ok = code
    ? !(await c.auth.exchangeCodeForSession(code)).error
    : recovery && hash
      ? !(await c.auth.verifyOtp({ type: "recovery", token_hash: hash })).error
      : false;
  return NextResponse.redirect(
    new URL(
      `/${l}/${recovery ? (ok ? "account/reset" : "account/forgot?expired=1") : ok ? "workspace" : "account?expired=1"}`,
      site(),
    ),
  );
}
