import Image from "next/image";
import { tr, type Locale } from "@/lib/model";
export function Photo({
  id,
  n,
  l,
  name,
}: {
  id: string;
  n: number;
  l: Locale;
  name: string;
}) {
  return (
    <picture>
      <source media="(max-width: 650px)" srcSet={`/media/${id}?size=small`} />
      <Image
        unoptimized
        loading="lazy"
        width={480}
        height={320}
        src={`/media/${id}`}
        alt={tr(
          l,
          `خدمة من ${name} · الصورة ${n}`,
          `Réalisation de ${name} · photo ${n}`,
        )}
        className="photo"
      />
    </picture>
  );
}
