import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { rpc } from "./server";

/**
 * Shared hourly budget for anonymous writes. The stored key is an HMAC of the
 * scope and a trusted ingress header; raw addresses never enter the database.
 */
export async function budget(scope: string, max: number) {
  const h = process.env.TRUSTED_CLIENT_IP_HEADER;
  const ip = (h && (await headers()).get(h)) || "shared";
  const client_key = createHmac(
    "sha256",
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
    .update(scope + ":" + ip)
    .digest("hex");
  return rpc<boolean>("take_quota", { client_key, max_hits: max }, true);
}
