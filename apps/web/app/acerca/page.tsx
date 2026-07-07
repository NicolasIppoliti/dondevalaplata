import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Acerca de — Portal de Transparencia de Coronel Rosales",
  description:
    "Qué es este portal, su declaración de neutralidad y la nota sobre protección de datos personales (Ley 25.326).",
};

export default function AcercaPage() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Acerca de este portal
        </h1>
        <p className="mt-4 max-w-2xl text-slate-700">
          Este es un portal ciudadano independiente que reúne datos públicos
          de Coronel Rosales — coparticipación municipal y fallos del
          Tribunal de Cuentas — a partir de fuentes oficiales, con el
          objetivo de que cualquier vecino o vecina pueda verificarlos por sí
          mismo/a.
        </p>
      </section>

      <section aria-labelledby="neutralidad-heading">
        <h2
          id="neutralidad-heading"
          className="text-xl font-semibold text-slate-900"
        >
          Declaración de neutralidad
        </h2>
        <p className="mt-2 max-w-2xl text-slate-700">
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

      <section aria-labelledby="datos-personales-heading">
        <h2
          id="datos-personales-heading"
          className="text-xl font-semibold text-slate-900"
        >
          Protección de datos personales (Ley 25.326)
        </h2>
        <p className="mt-2 max-w-2xl text-slate-700">
          Los nombres de funcionarios y funcionarias que aparecen en este
          portal corresponden a información pública vinculada al ejercicio de
          su función institucional (fallos del Tribunal de Cuentas de la
          Provincia de Buenos Aires), publicada originalmente por el propio
          organismo oficial. En cumplimiento de la Ley 25.326 de Protección
          de los Datos Personales, este portal no publica datos personales
          sensibles ni ajenos al ejercicio de la función pública. Si detectás
          un error o una inexactitud en algún dato transcripto, podés
          verificarlo contra la{" "}
          <Link href="/fuentes" className="underline underline-offset-2">
            fuente original y la copia archivada
          </Link>{" "}
          citadas en cada página.
        </p>
      </section>
    </div>
  );
}
