import Link from "next/link";
import type { Metadata } from "next";
import { getFalloEjerciciosDescending, getPortalData } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Fallos del Tribunal de Cuentas",
  description:
    "Índice de fallos del Tribunal de Cuentas de la Provincia de Buenos Aires sobre las cuentas municipales de Coronel Rosales, 2022-2024.",
};

export default function FallosIndexPage() {
  const { fallos } = getPortalData();
  const ejercicios = getFalloEjerciciosDescending(fallos);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          ¿Qué dicen los fallos del Tribunal de Cuentas?
        </h1>
        <p className="mt-4 max-w-[62ch] text-ink">
          El Tribunal de Cuentas de la Provincia de Buenos Aires audita las
          cuentas municipales ejercicio por ejercicio (año calendario). A
          continuación, los fallos disponibles para Coronel Rosales, con el
          mismo criterio de presentación para cada gestión.
        </p>
      </section>

      {/* Card grid, one card per ejercicio (modern skin: elevated,
          modest radius, ocre documentary accent) -- Direction B's
          tap-to-expand timeline was considered (see DESIGN.md decisions
          log) and deliberately NOT used: B already reads as a startup
          pitch rather than a documentary record, the same reason it was
          rejected for the whole redesign. Each card's ONLY link text stays
          exactly "Ejercicio {year}" (unchanged from before this slice) so
          `fallos-recency-order.test.tsx`'s exact accessible-name regex
          keeps passing; the fallo count is a separate, non-link line. */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ejercicios.map((ejercicio) => {
          const count = fallos.records.filter(
            (record) => record.ejercicio === ejercicio,
          ).length;
          return (
            <li
              key={ejercicio}
              className="rounded-lg border border-rule border-l-[6px] border-l-ocre bg-surface p-5 shadow-card transition-shadow hover:shadow-header"
            >
              <Link
                href={`/fallos/${ejercicio}`}
                className="inline-flex min-h-11 items-center font-display text-xl font-semibold text-ink no-underline"
              >
                Ejercicio {ejercicio}
              </Link>
              <p className="mt-1 font-mono text-xs text-muted">
                {count} {count === 1 ? "multa registrada" : "multas registradas"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
