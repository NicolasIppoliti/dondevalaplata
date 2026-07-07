import Link from "next/link";
import type { Metadata } from "next";
import { getPortalData } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Fallos del Tribunal de Cuentas",
  description:
    "Índice de fallos del Tribunal de Cuentas de la Provincia de Buenos Aires sobre las cuentas municipales de Coronel Rosales, 2022-2024.",
};

export default function FallosIndexPage() {
  const { fallos } = getPortalData();
  const ejercicios = [...new Set(fallos.records.map((record) => record.ejercicio))].sort();

  return (
    <div className="space-y-6">
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
      <ul className="border-t border-rule">
        {ejercicios.map((ejercicio) => (
          <li key={ejercicio} className="border-b border-rule py-4">
            <Link
              href={`/fallos/${ejercicio}`}
              className="font-display text-xl font-semibold"
            >
              Ejercicio {ejercicio}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
