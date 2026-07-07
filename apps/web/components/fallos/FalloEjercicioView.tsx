import { notFound } from "next/navigation";
import { FalloCard } from "@/components/fallos/FalloCard";
import { getPortalData, resolveSourceRef } from "@/lib/sources";

/**
 * Neutral, identical-treatment presentation of every HTC ruling for one
 * ejercicio (htc-fallos capability). Every record — regardless of which
 * administration or official it names — renders through the SAME
 * `FalloCard` template, with no adjectives or editorial commentary: cited
 * facts only. The only field whose VALUE legitimately varies is "Estado
 * del documento" (scanned-without-text-layer for 2022 vs extracted-text
 * for 2023/2024), and even that field is always present, never
 * conditionally hidden.
 *
 * Kept as a plain, synchronous, presentational component (container/
 * presentational split) so it can be unit-tested directly with
 * `@testing-library/react`, independent of the async `params` Promise the
 * real `app/fallos/[ejercicio]/page.tsx` route must await per Next.js 16.
 */
interface FalloEjercicioViewProps {
  ejercicio: string;
}

export function FalloEjercicioView({ ejercicio }: FalloEjercicioViewProps) {
  const { fallos, manifest } = getPortalData();
  const records = fallos.records.filter(
    (record) => record.ejercicio === ejercicio,
  );

  if (records.length === 0) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          Fallo del Tribunal de Cuentas — ejercicio {ejercicio}
        </h1>
      </section>

      <section
        aria-label={`Multas aplicadas en el ejercicio ${ejercicio}`}
        className="space-y-5"
      >
        {records.map((record, index) => (
          <FalloCard
            key={`${record.official}-${index}`}
            record={record}
            sourceLink={resolveSourceRef(record.sourceRefs[0], manifest)}
          />
        ))}
      </section>
    </div>
  );
}
