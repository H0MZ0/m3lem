import type { Metadata } from "next";
import { Suspense } from "react";
import { locale, demo } from "@/lib/server";
import { tr } from "@/lib/model";
import { Language } from "@/features/discovery/controls";
import { DraftProvider } from "@/features/discovery/draft-context";
import "../style.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "معلّم · M3lem", template: "%s | معلّم" },
  robots: { index: false, follow: false },
};
export default async function Layout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const l = locale((await params).lang);
  return (
    <html lang={l === "ar" ? "ary" : l} dir={l === "ar" ? "rtl" : "ltr"}>
      <body>
        <DraftProvider>
          <a className="skip" href="#main">
            {tr(l, "دوز للمحتوى", "Aller au contenu")}
          </a>
          <header className="top">
            <div className="wrap nav">
              <a
                className="brand"
                href={`/${l}`}
                aria-label={tr(l, "معلّم · الرئيسية", "M3lem · Accueil")}
              >
                <span className="mark" aria-hidden="true">
                  ⌂
                </span>
                معلّم <small lang="fr">M3LEM</small>
              </a>
              <nav>
                <a href={`/${l}/workspace`}>
                  {tr(l, "فضاء المعلّم", "Espace artisan")}
                </a>
                <Suspense>
                  <Language l={l} />
                </Suspense>
              </nav>
            </div>
          </header>
          <main id="main" className="wrap">
            {demo() && (
              <aside className="demo">
                {tr(
                  l,
                  "نسخة تجريبية محلية · البروفايلات خيالية والتواصل معاهم مطفّي.",
                  "Démo locale · Profils fictifs et contacts de démo désactivés.",
                )}
              </aside>
            )}
            {children}
          </main>
          <footer className="wrap">
            <span>معلّم · M3LEM</span>
            <a href={`/${l}/request`}>
              {tr(l, "طلب خدمة", "Demander un service")}
            </a>
            <a href={`/${l}/admin`}>{tr(l, "الإدارة", "Administration")}</a>
          </footer>
        </DraftProvider>
      </body>
    </html>
  );
}
