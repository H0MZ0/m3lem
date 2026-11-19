import type { MetadataRoute } from "next";
import { demo, site } from "@/lib/server";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: demo()
      ? { userAgent: "*", disallow: "/" }
      : {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/*/admin",
            "/*/workspace",
            "/*/account",
            "/*/review/",
            "/media/",
            "/*/search",
            "/auth/",
          ],
        },
    sitemap: site().origin + "/sitemap.xml",
  };
}
