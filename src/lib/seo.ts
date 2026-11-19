import type { Metadata } from "next";
import { demo, site } from "./server";
import type { Locale } from "./model";
export function seo(
  l: Locale,
  path: string,
  title: string,
  description: string,
  index = true,
): Metadata {
  return {
    metadataBase: site(),
    title,
    description,
    robots: { index: index && !demo(), follow: !demo() },
    alternates: {
      canonical: `/${l}${path}`,
      languages: { "ar-MA": `/ar${path}`, fr: `/fr${path}` },
    },
  };
}
