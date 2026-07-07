import { notFound } from "next/navigation";
import { SourcesFooter } from "@/components/SourcesFooter";
import { formatArsCompact, formatDateEsAr } from "@/lib/format";
import { getPortalData, resolveSourceRef } from "@/lib/sources";

/**
 * Neutral, identical-treatment presentation of every HTC ruling for one
 * ejercicio (htc-fallos capability). Every record — regardless of which
 * administration or official it names — renders the SAME field set, in the
 * same order, with no adjectives or editorial commentary: cited facts only.
 * The only field whose VALUE legitimately varies is "Estado del documento"
 * (scanned-without-text-layer for 2022 vs extracted-text for 2023/2024),
 * and even that field is always present, never conditionally hidden.
 *
 * Kept as a plain, synchronous, presentational component (container/
 * presentational split) so it can be unit-tested directly with
 * `@testing-library/react`, independent of the async `params` Promise the
 * real `app/fallos/[ejercicio]/page.tsx` route must await per Next.js 16.
 */
interface FalloEjercicioViewProps {
  ejercicio: string;
}

const FIELD_LABELS = {
  falloId: "Expediente",
  falloDate: "Fecha del fallo",
  administration: "Gestión",
  official: "Funcionario/a",
  role: "Cargo",
  fineArs: "Multa",
  documentStatus: "Estado del documento",
} as const;

export function FalloEjercicioView({ ejercicio }: FalloEjercicioViewProps) {
  const { fallos, manifest } = getPortalData();
  const records = fallos.records.filter(
    (record) => record.ejercicio === ejercicio,
  );

  if (records.length === 0) {
    notFound();
  }

  const sourceLink = resolveSourceRef(records[0].sourceRefs[0], manifest);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Fallo del Tribunal de Cuentas — ejercicio {ejercicio}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Expediente {records[0].falloId}, fallo del{" "}
          {formatDateEsAr(records[0].falloDate)}.
        </p>
      </section>

      <section
        aria-label={`Multas aplicadas en el ejercicio ${ejercicio}`}
        className="space-y-6"
      >
        {records.map((record, index) => (
          <dl
            key={`${record.official}-${index}`}
            className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-5 text-sm"
          >
            <dt className="font-medium text-slate-500">
              {FIELD_LABELS.falloId}
            </dt>
            <dd className="text-slate-900">{record.falloId}</dd>

            <dt className="font-medium text-slate-500">
              {FIELD_LABELS.falloDate}
            </dt>
            <dd className="text-slate-900">
              {formatDateEsAr(record.falloDate)}
            </dd>

            <dt className="font-medium text-slate-500">
              {FIELD_LABELS.administration}
            </dt>
            <dd className="text-slate-900">{record.administration}</dd>

            <dt className="font-medium text-slate-500">
              {FIELD_LABELS.official}
            </dt>
            <dd className="text-slate-900">{record.official}</dd>

            <dt className="font-medium text-slate-500">
              {FIELD_LABELS.role}
            </dt>
            <dd className="text-slate-900">{record.role}</dd>

            <dt className="font-medium text-slate-500">
              {FIELD_LABELS.fineArs}
            </dt>
            <dd className="text-slate-900">
              {formatArsCompact(record.fineArs ?? 0)}
            </dd>

            <dt className="font-medium text-slate-500">
              {FIELD_LABELS.documentStatus}
            </dt>
            <dd className="text-slate-900">
              {record.textExtracted
                ? "Texto extraído del PDF original"
                : "Documento escaneado, texto no extraído"}
            </dd>
          </dl>
        ))}
      </section>

      <SourcesFooter links={[sourceLink]} />
    </div>
  );
}
