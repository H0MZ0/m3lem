import { createHash } from "node:crypto";
import { privileged, rpc } from "@/lib/server";
import { uuid } from "@/lib/model";
export async function GET(
  req: Request,
  { params }: RouteContext<"/request-media/[id]">,
) {
  const { id } = await params,
    token = new URL(req.url).searchParams.get("token") ?? "",
    headers = {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    };
  if (
    !uuid(id) ||
    !(await rpc<boolean>("can_read_request_photo", {
      asset: id,
      token_hash: /^[0-9a-f]{64}$/.test(token)
        ? createHash("sha256").update(token).digest("hex")
        : "",
    }))
  )
    return new Response(null, { status: 404, headers });
  const { data, error } = await privileged()
    .storage.from("request-media")
    .download(id + ".webp");
  if (error) return new Response(null, { status: 404, headers });
  return new Response(data, {
    headers: { ...headers, "Content-Type": "image/webp" },
  });
}
