import Link from "next/link";
import { PedidoGenerator } from "@/components/pedidos/PedidoGenerator";
import { PedidosTracker } from "@/components/pedidos/PedidosTracker";
import { buildPageMetadata } from "@/lib/seo";
import { getPortalData } from "@/lib/sources";

export const metadata = buildPageMetadata({
  title: "Pedidos de acceso a la información",
  description:
    "Generá tu pedido de acceso a la información pública bajo la Ordenanza 3638 de Coronel Rosales, directamente en tu navegador, y hacé seguimiento del plazo de 30 días hábiles.",
  path: "/pedidos",
});

/**
 * /pedidos — pedido de acceso a la información generator + tracker
 * (feature G4, closing the "filoso" set: G1 cadence dashboard, G2 gasto por
 * partida, G3 adjudicaciones SIBOM). Unlike every other route, this page
 * has NO ETL step and NO archived external source of its own: it is a
 * tool that helps a visitor exercise a right (Ordenanza 3638) plus a
 * tracker over a small, hand-edited `data/pedidos.json` the portal owner
 * updates when he files a pedido or gets a response.
 *
 * Two independent pieces, both described in DESIGN.md:
 * - `PedidoGenerator`: a CLIENT-side form (nothing sent anywhere -- see the
 *   disclosure line inside it) that assembles a formatted letter citing
 *   Ordenanza 3638 Arts. 2, 6 and 11 (the last one only when the chosen
 *   preset actually falls under an Art. 11 inciso).
 * - `PedidosTracker`: renders `data/pedidos.json` server-side (via
 *   `getPortalData()`, same as every other page) and computes the Art. 8
 *   30-día-hábil plazo status CLIENT-side, post-mount, so the "días sin
 *   respuesta" figure reflects the visitor's actual today rather than a
 *   date baked in at build time.
 *
 * Honest scope note (verified, see the project's own
 * `data/gap-100-y-detalle-gasto` research): the national FOIA law
 * (27.275) does not reach municipios, and Ordenanza 3638 itself does not
 * regulate what happens on silence -- both stated plainly below rather
 * than glossed over.
 */
export default function PedidosPage() {
  const { pedidos } = getPortalData();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-[clamp(26px,4vw,40px)] font-semibold text-ink">
          ¿Cómo pedís el detalle completo?
        </h1>
        <p className="mt-3 font-mono text-sm font-semibold tracking-[0.1em] text-stamp uppercase sm:text-base">
          Generador de pedido + seguimiento · Ordenanza 3638 (Coronel
          Rosales)
        </p>

        <div className="mt-5 max-w-[72ch] space-y-3 text-ink">
          <p>
            La Ordenanza N° 3638 de Coronel Rosales (sancionada el
            14/03/2017, promulgada el 16/03/2017) reconoce el derecho de
            cualquier persona a pedirle información al Departamento
            Ejecutivo y/o al Concejo Deliberante (Art. 2°). Además, el
            Art. 11° ya obliga al sitio oficial del municipio a publicar el
            detalle de gastos de compras y contrataciones, el padrón de
            proveedores y los gastos de contratación de personal — algo
            que hoy no cumple del todo. Un pedido bajo esta ordenanza no es
            pedir un favor: es exigir el cumplimiento de una obligación
            legal que ya existe.
          </p>
          <p>
            El formulario de acá abajo arma el texto del pedido por vos, en
            tu propio navegador, listo para copiar, imprimir o descargar.
            El seguimiento de acá abajo del todo muestra los pedidos ya
            presentados y cuántos días hábiles pasaron desde entonces.
          </p>
        </div>

        <div className="mt-5 max-w-[74ch] rounded-md border border-ocre border-l-[5px] bg-ocre-soft p-4">
          <h2 className="font-sans text-sm font-bold text-ink">
            Qué cubre esto — y qué NO
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-sm text-ink-2">
            La Ley Nacional 27.275 de acceso a la información pública{" "}
            <strong>no alcanza a los municipios</strong>. La Ley Provincial
            12.475 y su Decreto 2549/04 rigen el Poder Ejecutivo provincial
            y solo <strong>instan</strong> (no obligan) a los municipios a
            adherir. Coronel Rosales se rige por su propia Ordenanza 3638,
            que además <strong>no establece qué pasa si no responden</strong>{" "}
            —no hay un &quot;silencio = denegatoria&quot; reglado—, así que el
            seguimiento de acá abajo documenta el silencio como lo que es:
            un hecho, no una sanción automática.
          </p>
        </div>

        <details className="mt-5 max-w-[74ch] rounded-md border border-rule bg-surface p-4">
          <summary className="cursor-pointer font-sans text-sm font-semibold text-ink">
            Base legal completa y qué hacer si no responden
          </summary>
          <div className="mt-3 space-y-2 text-sm text-ink-2">
            <p>
              <strong className="text-ink">Art. 3°:</strong> la ordenanza
              adhiere a los principios del Decreto Nacional 1172/03.{" "}
              <strong className="text-ink">Art. 6°:</strong> el pedido debe
              hacerse por escrito, identificando al peticionante, con
              domicilio real y un domicilio CONSTITUIDO dentro de Coronel
              Rosales, un objeto preciso, y puede solicitarse copia
              digital; hay que sellarlo con cargo y fecha en Mesa de
              Entradas. <strong className="text-ink">Art. 8°:</strong> el
              plazo para responder es de 30 días hábiles.
            </p>
            <p>
              Si se cumple el plazo sin respuesta, el paso siguiente es un{" "}
              <strong className="text-ink">pronto despacho</strong>{" "}
              (Ordenanza General 267/80); si tampoco hay respuesta,
              corresponde un{" "}
              <strong className="text-ink">amparo por mora</strong> (Ley
              12.008, Código Procesal Contencioso Administrativo de la
              Provincia de Buenos Aires); después, un{" "}
              <strong className="text-ink">amparo</strong> (Ley 13.928); y,
              como última instancia, se puede acudir a la{" "}
              <strong className="text-ink">
                Defensoría del Pueblo de la Provincia de Buenos Aires
              </strong>
              .
            </p>
          </div>
        </details>
      </section>

      <section aria-labelledby="generador-heading">
        <h2
          id="generador-heading"
          className="font-display text-[clamp(22px,3.4vw,32px)] font-semibold text-ink"
        >
          Generá tu pedido
        </h2>
        <p className="mt-1 max-w-[62ch] text-sm text-ink-2">
          Se genera enteramente en tu navegador: nada de lo que completes
          acá se envía a ningún servidor.
        </p>
        <div className="mt-5">
          <PedidoGenerator />
        </div>
      </section>

      <section aria-labelledby="seguimiento-heading">
        <h2
          id="seguimiento-heading"
          className="font-display text-[clamp(22px,3.4vw,32px)] font-semibold text-ink"
        >
          Seguimiento de pedidos presentados
        </h2>
        <p className="mt-1 max-w-[62ch] text-sm text-ink-2">
          Cada fila es un pedido real ya presentado, cargado a mano cuando
          se presenta o se recibe una respuesta —{" "}
          <Link href="/fuentes">ver cómo funciona el resto del portal</Link>
          {" "}con datos verificados y archivados.
        </p>
        <div className="mt-5">
          <PedidosTracker pedidos={pedidos.pedidos} />
        </div>
      </section>
    </div>
  );
}
