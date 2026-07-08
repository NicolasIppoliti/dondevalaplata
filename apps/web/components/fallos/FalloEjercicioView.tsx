import Link from "next/link";
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
        <Link
          href="/fallos"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rule bg-surface px-3.5 font-mono text-sm text-ink no-underline shadow-control hover:bg-surface-2"
        >
          ← Todas las multas
        </Link>
        <h1 className="mt-4 font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          Multas del Tribunal de Cuentas — ejercicio {ejercicio}
        </h1>
        <p className="mt-3 max-w-[62ch] text-ink">
          Es una sanción administrativa por cómo se rindieron las cuentas, no
          una condena penal.
        </p>
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
