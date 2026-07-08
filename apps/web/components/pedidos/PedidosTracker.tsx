"use client";

import { useEffect, useState } from "react";
import { formatDateEsAr } from "@/lib/format";
import { computePlazoStatus, toISODateLocal } from "@/lib/pedidos";
import type { PedidoRecord } from "@/lib/schemas";

const ESTADO_LABEL: Record<PedidoRecord["estado"], string> = {
  presentado: "Presentado",
  respondido: "Respondido",
  vencido: "Vencido",
};

/**
 * Reads `data/pedidos.json` (via `getPortalData()` in `app/pedidos/page.tsx`)
 * and renders each pedido's stored facts (objeto, fecha, expediente,
 * estado) alongside a LIVE-computed plazo status. This is a client island
 * for exactly one reason: the "días hábiles transcurridos" figure has to
 * reflect the VISITOR's actual today, not the day this page happened to be
 * built (see `lib/pedidos.ts`'s `toISODateLocal` docstring) -- on a
 * statically-prerendered site, computing it during the server render would
 * bake in a stale count that never updates between deploys.
 *
 * Before mount, every row still shows its real stored data (objeto, fecha
 * presentado, expediente, estado) -- only the derived "plazo" text is
 * progressively enhanced, same "never hide real data, only enhance the
 * derived bit" pattern as `ScrollReveal`/`CountUp`.
 */
export function PedidosTracker({ pedidos }: { pedidos: PedidoRecord[] }) {
  const [todayISO, setTodayISO] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTodayISO(toISODateLocal(new Date()));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (pedidos.length === 0) {
    return (
      <p className="rounded-lg border border-rule bg-surface p-5 text-ink-2 shadow-card">
        Todavía no se presentó ningún pedido. Cuando generes el tuyo y lo
        presentes, se va a poder cargar acá para hacerle seguimiento.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {pedidos.map((pedido, index) => (
        <li
          key={`${pedido.expediente}-${index}`}
          className="rounded-lg border border-rule bg-surface p-5 shadow-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">
              {pedido.objeto}
            </h3>
            <span
              className={`inline-flex flex-none items-center rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${
                pedido.estado === "respondido"
                  ? "bg-olive-tint text-olive"
                  : "bg-ocre-soft text-ink-2"
              }`}
            >
              {ESTADO_LABEL[pedido.estado]}
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 font-mono text-[13px] text-ink-2 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] text-muted uppercase">
                Fecha de presentación
              </dt>
              <dd className="tabular-nums text-ink">
                {formatDateEsAr(pedido.fechaPresentado)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted uppercase">Expediente</dt>
              <dd className="text-ink">{pedido.expediente}</dd>
            </div>
            {pedido.estado === "respondido" && pedido.fechaRespuesta ? (
              <div>
                <dt className="text-[11px] text-muted uppercase">Respondido</dt>
                <dd className="tabular-nums text-ink">
                  {formatDateEsAr(pedido.fechaRespuesta)}
                </dd>
              </div>
            ) : null}
          </dl>

          <PedidoPlazoStatus pedido={pedido} todayISO={todayISO} />

          {pedido.respuestaUrl ? (
            <p className="mt-3 text-sm">
              <a href={pedido.respuestaUrl} target="_blank" rel="noopener noreferrer">
                Ver la respuesta
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            </p>
          ) : null}

          {pedido.notas ? (
            <p className="mt-3 border-l-[3px] border-rule-soft pl-3 text-sm text-ink-2">
              {pedido.notas}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * The live plazo readout for a single pedido -- isolated so its
 * "calculando…" placeholder only ever affects this one line, never the
 * pedido's real stored data above it.
 */
function PedidoPlazoStatus({
  pedido,
  todayISO,
}: {
  pedido: PedidoRecord;
  todayISO: string | null;
}) {
  if (pedido.estado === "respondido" && !pedido.fechaRespuesta) {
    return null;
  }

  if (!todayISO) {
    return (
      <p className="mt-3 font-mono text-xs text-muted" role="status">
        Calculando días hábiles transcurridos…
      </p>
    );
  }

  const status = computePlazoStatus(pedido, todayISO);

  if (status.frozen) {
    return (
      <p className="mt-3 text-sm text-ink-2">
        Respondido a los <strong className="text-ink">{status.businessDaysElapsed}</strong>{" "}
        días hábiles de presentado
        {status.isOverdue ? ", superando el plazo del Art. 8° (30 días hábiles)" : ""}.
      </p>
    );
  }

  if (status.isOverdue) {
    return (
      <div className="mt-3 rounded-md border border-stamp border-l-[5px] bg-stamp-tint p-3">
        <p className="text-sm font-semibold text-ink">
          {status.businessDaysElapsed} días hábiles sin respuesta — supera el
          plazo del Art. 8° de la Ordenanza 3638 (30 días hábiles).
        </p>
        <p className="mt-1.5 text-sm text-ink-2">
          Próximo paso: presentar un pronto despacho; si tampoco hay
          respuesta, corresponde un amparo por mora.
        </p>
      </div>
    );
  }

  return (
    <p className="mt-3 text-sm text-ink-2">
      {status.businessDaysElapsed} de {status.deadlineDays} días hábiles
      transcurridos — quedan {status.businessDaysRemaining} para el vencimiento
      del plazo del Art. 8°.
    </p>
  );
}
