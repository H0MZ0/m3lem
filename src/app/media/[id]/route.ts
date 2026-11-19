import { demo, privileged, rpc } from "@/lib/server";
import { uuid } from "@/lib/model";
export async function GET(
  req: Request,
  { params }: RouteContext<"/media/[id]">,
) {
  const { id } = await params,
    headers = {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    };
  if (
    !uuid(id) ||
    !(await rpc<boolean>("can_read_asset", { asset: id, show_demo: demo() }))
  )
    return new Response(null, { status: 404, headers });
  const { data, error } = await privileged()
    .storage.from("portfolio")
    .download(
      id +
        (new URL(req.url).searchParams.get("size") === "small"
          ? ".small.webp"
          : ".webp"),
    );
  if (error) return new Response(null, { status: 404, headers });
  return new Response(data, {
    headers: { ...headers, "Content-Type": "image/webp" },
  });
}
