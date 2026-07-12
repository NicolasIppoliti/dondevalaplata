"use client";

import { useEffect, useId, useState } from "react";
import {
  generatePedidoText,
  PEDIDO_PRESETS,
  type PedidoDestinatario,
  type PedidoFormInput,
  type PedidoObjetoPresetId,
} from "@/lib/pedidoLetter";
import { toISODateLocal } from "@/lib/pedidos";

const INITIAL_FORM: PedidoFormInput = {
  objetoPreset: PEDIDO_PRESETS[0].id,
  destinatario: "ejecutivo",
  periodo: "",
  objetoPersonalizado: "",
  nombreCompleto: "",
  dni: "",
  domicilioReal: "",
  domicilioConstituido: "",
  email: "",
};

/**
 * The ONLY client island the /pedidos generator needs (DESIGN.md "islas de
 * cliente chicas y puntuales"): a controlled form whose fields feed
 * `generatePedidoText` (lib/pedidoLetter.ts, pure and fully unit-tested) to
 * render a live preview. Everything happens in the browser -- there is no
 * `fetch`, no submit handler, nothing sent anywhere (see the disclosure
 * line rendered below the preview).
 *
 * The letter's own date (`todayISO`) is deliberately read from a
 * `useEffect` AFTER mount, deferred one animation frame (same pattern as
 * `ScrollReveal`/`useCountUp`) rather than during the initial render --
 * reading `new Date()` directly in a statically-prerendered page would
 * bake the BUILD's date into the HTML forever, silently going stale for
 * every visitor after deploy day. Before that effect runs, the preview
 * shows a neutral placeholder instead of guessing a date.
 */
export function PedidoGenerator() {
  const [form, setForm] = useState<PedidoFormInput>(INITIAL_FORM);
  const [todayISO, setTodayISO] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const formId = useId();
  const previewHeadingId = `${formId}-preview-heading`;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTodayISO(toISODateLocal(new Date()));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const selectedPreset =
    PEDIDO_PRESETS.find((preset) => preset.id === form.objetoPreset) ?? PEDIDO_PRESETS[0];
  const letterText = todayISO ? generatePedidoText(form, todayISO) : null;

  function updateField<K extends keyof PedidoFormInput>(
    key: K,
    value: PedidoFormInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setCopyStatus("idle");
  }

  function updateObjetoPreset(id: PedidoObjetoPresetId) {
    setForm((prev) => ({ ...prev, objetoPreset: id }));
    setCopyStatus("idle");
  }

  async function handleCopy() {
    if (!letterText) return;
    try {
      await navigator.clipboard.writeText(letterText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  function handleDownload() {
    if (!letterText) return;
    const blob = new Blob([letterText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pedido-acceso-informacion-${form.objetoPreset}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  const inputClassName =
    "mt-1.5 min-h-11 w-full rounded-sm border border-rule bg-surface px-3 py-2 text-[15px] text-ink shadow-control focus-visible:outline-2 focus-visible:outline-stamp";
  const labelClassName = "block font-mono text-xs tracking-[0.1em] text-muted uppercase";
  const buttonClassName =
    "inline-flex min-h-11 items-center justify-center rounded-sm border-2 border-ink px-4 font-sans text-sm font-semibold text-ink no-underline transition-colors hover:bg-ink hover:text-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div
        role="group"
        aria-label="Datos para generar tu pedido"
        className="space-y-5 rounded-lg border border-rule bg-surface p-5 shadow-card"
      >
        <div>
          <label htmlFor={`${formId}-objeto`} className={labelClassName}>
            ¿Qué querés pedir?
          </label>
          <select
            id={`${formId}-objeto`}
            value={form.objetoPreset}
            onChange={(event) =>
              updateObjetoPreset(event.target.value as PedidoObjetoPresetId)
            }
            className={inputClassName}
          >
            {PEDIDO_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
          {selectedPreset.helperNote ? (
            <p className="mt-1.5 text-xs text-muted">{selectedPreset.helperNote}</p>
          ) : null}
        </div>

        {selectedPreset.needsPeriodo ? (
          <div>
            <label htmlFor={`${formId}-periodo`} className={labelClassName}>
              Período
            </label>
            <input
              id={`${formId}-periodo`}
              type="text"
              value={form.periodo ?? ""}
              onChange={(event) => updateField("periodo", event.target.value)}
              placeholder='Ej: "1er trimestre 2026"'
              className={inputClassName}
            />
          </div>
        ) : null}

        {selectedPreset.id === "personalizado" ? (
          <div>
            <label htmlFor={`${formId}-personalizado`} className={labelClassName}>
              Redactá qué información pedís
            </label>
            <textarea
              id={`${formId}-personalizado`}
              value={form.objetoPersonalizado ?? ""}
              onChange={(event) =>
                updateField("objetoPersonalizado", event.target.value)
              }
              rows={3}
              placeholder="Ej: el listado de convenios urbanísticos vigentes"
              className={inputClassName}
            />
          </div>
        ) : null}

        <div>
          <label htmlFor={`${formId}-destinatario`} className={labelClassName}>
            ¿A quién se lo pedís?
          </label>
          <select
            id={`${formId}-destinatario`}
            value={form.destinatario}
            onChange={(event) =>
              updateField("destinatario", event.target.value as PedidoDestinatario)
            }
            className={inputClassName}
          >
            <option value="ejecutivo">Departamento Ejecutivo (Intendencia)</option>
            <option value="hcd">Honorable Concejo Deliberante (HCD)</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-nombre`} className={labelClassName}>
              Nombre y apellido
            </label>
            <input
              id={`${formId}-nombre`}
              type="text"
              value={form.nombreCompleto ?? ""}
              onChange={(event) => updateField("nombreCompleto", event.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor={`${formId}-dni`} className={labelClassName}>
              DNI
            </label>
            <input
              id={`${formId}-dni`}
              type="text"
              inputMode="numeric"
              value={form.dni ?? ""}
              onChange={(event) => updateField("dni", event.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label htmlFor={`${formId}-domicilio-real`} className={labelClassName}>
            Domicilio real
          </label>
          <input
            id={`${formId}-domicilio-real`}
            type="text"
            value={form.domicilioReal ?? ""}
            onChange={(event) => updateField("domicilioReal", event.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-domicilio-constituido`} className={labelClassName}>
            Domicilio constituido en Coronel Rosales
          </label>
          <input
            id={`${formId}-domicilio-constituido`}
            type="text"
            value={form.domicilioConstituido ?? ""}
            onChange={(event) =>
              updateField("domicilioConstituido", event.target.value)
            }
            className={inputClassName}
          />
          <p className="mt-1 text-xs text-muted">
            Requisito del Art. 6°: el domicilio donde te van a poder
            notificar, dentro del partido de Coronel Rosales.
          </p>
        </div>

        <div>
          <label htmlFor={`${formId}-email`} className={labelClassName}>
            Email
          </label>
          <input
            id={`${formId}-email`}
            type="email"
            value={form.email ?? ""}
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-md border border-ocre border-l-[5px] bg-ocre-soft p-4">
          <h2 className="font-sans text-sm font-bold text-ink">Cómo presentarlo</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-2">
            <li>Llevalo (impreso o en el celular) a la Mesa de Entradas correspondiente.</li>
            <li>
              Pedí que te sellen y te pongan cargo con fecha: es tu comprobante
              de que lo presentaste.
            </li>
            <li>
              Anotá el número de expediente que te den — lo vas a necesitar
              para hacer el seguimiento acá abajo.
            </li>
          </ul>
        </div>

        <section
          aria-labelledby={previewHeadingId}
          className="rounded-lg border border-rule bg-surface shadow-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
            <h2 id={previewHeadingId} className={labelClassName}>
              Vista previa de tu pedido
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!letterText}
                className={buttonClassName}
              >
                {copyStatus === "copied" ? "Copiado ✓" : "Copiar"}
              </button>
              <span role="status" aria-live="polite" className="sr-only">
                {copyStatus === "copied"
                  ? "Pedido copiado al portapapeles"
                  : copyStatus === "error"
                    ? "No se pudo copiar el pedido"
                    : ""}
              </span>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!letterText}
                className={buttonClassName}
              >
                Descargar .txt
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!letterText}
                className={buttonClassName}
              >
                Imprimir
              </button>
            </div>
          </div>
          <pre className="print-area max-h-[70vh] overflow-y-auto p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-ink">
            {letterText ?? "Completá el formulario para generar tu pedido…"}
          </pre>
        </section>

        <p className="text-xs text-muted">
          Todo esto se genera en tu navegador: nada de lo que escribas acá se
          envía a ningún servidor.
        </p>
      </div>
    </div>
  );
}
