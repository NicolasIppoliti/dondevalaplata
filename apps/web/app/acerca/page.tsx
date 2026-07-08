import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Acerca de",
  description:
    "Qué es este portal, su declaración de neutralidad y la nota sobre protección de datos personales (Ley 25.326).",
};

export default function AcercaPage() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          Acerca de este portal
        </h1>
        <p className="mt-4 max-w-[62ch] text-ink">
          Este es un portal ciudadano independiente que reúne datos públicos
          de Coronel Rosales — coparticipación municipal y fallos del
          Tribunal de Cuentas — a partir de fuentes oficiales, con el
          objetivo de que cualquier vecino o vecina pueda verificarlos por sí
          mismo/a.
        </p>
      </section>

      <section
        aria-labelledby="neutralidad-heading"
        className="rounded-lg border border-rule bg-surface p-6 shadow-card"
      >
        <h2
          id="neutralidad-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          Declaración de neutralidad
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink">
          Este portal no pertenece a ningún partido político ni recibe
          financiamiento de campañas. Toda la información se presenta con el
          mismo criterio y la misma estructura, sin importar qué gestión
          municipal esté involucrada: los mismos campos, el mismo formato y
          el mismo nivel de detalle para cada ejercicio y cada funcionario o
          funcionaria mencionados. No se incluyen adjetivos, valoraciones ni
          interpretaciones — solo hechos citados con su fuente original y su
          copia archivada.
        </p>
      </section>

      <section
        aria-labelledby="datos-personales-heading"
        className="rounded-lg border border-rule bg-surface p-6 shadow-card"
      >
        <h2
          id="datos-personales-heading"
          className="font-display text-xl font-semibold text-ink"
        >
          Protección de datos personales (Ley 25.326)
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink">
          Los nombres de funcionarios y funcionarias que aparecen en este
          portal corresponden a información pública vinculada al ejercicio de
          su función institucional (fallos del Tribunal de Cuentas de la
          Provincia de Buenos Aires), publicada originalmente por el propio
          organismo oficial. En cumplimiento de la Ley 25.326 de Protección
          de los Datos Personales, este portal no publica datos personales
          sensibles ni ajenos al ejercicio de la función pública. Si detectás
          un error o una inexactitud en algún dato transcripto, podés
          verificarlo contra la <Link href="/fuentes">fuente original y la copia archivada</Link>{" "}
          citadas en cada página.
        </p>
      </section>
    </div>
  );
}
