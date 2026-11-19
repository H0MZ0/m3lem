import { NextRequest, NextResponse } from "next/server";
import { client, site } from "@/lib/server";
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams,
    l = p.get("lang") === "fr" ? "fr" : "ar",
    code = p.get("code");
  const ok =
    code && !(await (await client()).auth.exchangeCodeForSession(code)).error;
  return NextResponse.redirect(
    new URL(`/${l}/${ok ? "workspace" : "account?expired=1"}`, site()),
  );
}
