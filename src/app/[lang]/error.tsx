"use client";
import { usePathname } from "next/navigation";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const ar = usePathname().startsWith("/ar");
  return (
    <section role="alert" className="panel">
      <h2>{ar ? "تعذر تحميل الصفحة" : "Page indisponible"}</h2>
      <button onClick={reset}>{ar ? "عاود جرّب" : "Réessayer"}</button>
    </section>
  );
}
