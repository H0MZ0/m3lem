import Link from "next/link";
export default function Missing() {
  return (
    <section className="panel">
      <h1>هاد الصفحة ما بقاتش هنا · Page introuvable</h1>
      <Link href="/ar">الرئيسية</Link> · <Link href="/fr">Accueil</Link>
    </section>
  );
}
