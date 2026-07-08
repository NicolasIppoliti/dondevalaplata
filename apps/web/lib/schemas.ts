import { z } from "zod";

/**
 * Zod schemas validating the build-time JSON boundary between the ETL
 * pipeline (Python, writes `data/*.json` + `archive-manifest.json`) and the
 * Next.js static site (reads that JSON at build time only, never at request
 * time). Every unknown value crossing this boundary MUST be parsed through
 * one of these schemas before use — never cast with `as` or typed `any`.
 */

export const MANIFEST_STATUS = {
  OK: "ok",
  ERROR: "error",
} as const;

export type ManifestStatus = (typeof MANIFEST_STATUS)[keyof typeof MANIFEST_STATUS];

export const manifestRecordSchema = z.object({
  id: z.string().min(1),
  capability: z.string().min(1),
  source: z.string().min(1),
  source_url: z.string().min(1),
  archived_url: z.string().min(1).nullable(),
  archived_path: z.string().min(1).nullable().optional(),
  sha256: z.string().min(1),
  mime: z.string().min(1),
  bytes: z.number().nonnegative(),
  fetched_at: z.string().min(1),
  status: z.string().min(1),
  notes: z.string().optional(),
});

export const manifestSchema = z.array(manifestRecordSchema);

export type ManifestRecord = z.infer<typeof manifestRecordSchema>;
export type Manifest = z.infer<typeof manifestSchema>;

export const coparticipacionPointSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  nominalArs: z.number(),
  realArs: z.number(),
});

export const coparticipacionSeriesSchema = z.object({
  municipioId: z.string().min(1),
  municipio: z.string().min(1),
  baseMonth: z.string().regex(/^\d{4}-\d{2}$/),
  points: z.array(coparticipacionPointSchema),
  sourceRefs: z.array(z.string().min(1)).min(1),
});

export const coparticipacionDataSchema = z.object({
  generatedAt: z.string().min(1),
  dataThrough: z.string().regex(/^\d{4}-\d{2}$/),
  ipcSeriesId: z.string().min(1),
  baseMonth: z.string().regex(/^\d{4}-\d{2}$/),
  lagNote: z.string().min(1),
  sourceRefs: z.array(z.string().min(1)).min(1),
  series: z.array(coparticipacionSeriesSchema).min(1),
});

export type CoparticipacionPoint = z.infer<typeof coparticipacionPointSchema>;
export type CoparticipacionSeries = z.infer<typeof coparticipacionSeriesSchema>;
export type CoparticipacionData = z.infer<typeof coparticipacionDataSchema>;

export const falloRecordSchema = z.object({
  ejercicio: z.string().min(1),
  falloId: z.string().min(1),
  falloDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  administration: z.string().min(1),
  official: z.string().min(1),
  role: z.string().min(1),
  fineArs: z.number().nullable(),
  scanned: z.boolean(),
  textExtracted: z.boolean(),
  sourceRefs: z.array(z.string().min(1)).min(1),
});

export const fallosDataSchema = z.object({
  generatedAt: z.string().min(1),
  sourceRefs: z.array(z.string().min(1)).min(1),
  records: z.array(falloRecordSchema).min(1),
});

export type FalloRecord = z.infer<typeof falloRecordSchema>;
export type FallosData = z.infer<typeof fallosDataSchema>;

export const transparenciaDimensionSchema = z.object({
  name: z.string().min(1),
  got: z.number(),
  max: z.number(),
});

export const transparenciaTrendPointSchema = z.object({
  reportLabel: z.string().min(1),
  total: z.number(),
  category: z.string().min(1),
  sourceRef: z.string().min(1),
});

export const transparenciaDataSchema = z.object({
  generatedAt: z.string().min(1),
  source: z.string().min(1),
  sourceFullName: z.string().min(1),
  sourceType: z.string().min(1),
  indexName: z.string().min(1),
  scope: z.string().min(1),
  framework: z.string().min(1),
  reportLabel: z.string().min(1),
  dataThrough: z.string().min(1),
  indexUrl: z.string().min(1),
  max: z.number(),
  total: z.number(),
  category: z.string().min(1),
  dimensions: z.array(transparenciaDimensionSchema).min(1),
  trend: z.array(transparenciaTrendPointSchema).min(1),
  sourceRefs: z.array(z.string().min(1)).min(1),
});

export type TransparenciaDimension = z.infer<typeof transparenciaDimensionSchema>;
export type TransparenciaTrendPoint = z.infer<typeof transparenciaTrendPointSchema>;
export type TransparenciaData = z.infer<typeof transparenciaDataSchema>;

export const cadenciaDimensionSchema = z.object({
  name: z.string().min(1),
  got: z.number(),
  max: z.number(),
  lastPeriodPublished: z.string().min(1).nullable(),
  lastPublishedAt: z.string().min(1).nullable(),
  lagMonths: z.number().nullable(),
  reason: z.string().min(1),
  toReach10: z.string().min(1),
  sourceRefs: z.array(z.string().min(1)),
});

export const cadenciaDeudaSchema = z.object({
  lastPeriod: z.string().min(1),
  lastPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastFigureArs: z.number(),
  lastFigureLabel: z.string().min(1),
  quartersMissing: z.number().nonnegative(),
  elapsedDays: z.number(),
  ordenanzaRef: z.string().min(1),
  ordenanzaArticle: z.string().min(1),
  ordenanzaNote: z.string().min(1),
  sourceRefs: z.array(z.string().min(1)).min(1),
});

export const cadenciaDataSchema = z.object({
  generatedAt: z.string().min(1),
  asapReport: z.string().min(1),
  asapCutoffLabel: z.string().min(1),
  killerFact: z.string().min(1),
  killerFactSourceRef: z.string().min(1),
  dimensions: z.array(cadenciaDimensionSchema).min(1),
  deuda: cadenciaDeudaSchema,
  sourceRefs: z.array(z.string().min(1)).min(1),
});

export type CadenciaDimension = z.infer<typeof cadenciaDimensionSchema>;
export type CadenciaDeuda = z.infer<typeof cadenciaDeudaSchema>;
export type CadenciaData = z.infer<typeof cadenciaDataSchema>;

/**
 * Feature G2: the RAFAM "gasto por partida" explorer tree. Pruned to three
 * levels (Jurisdicción -> Programa -> Objeto leaf) -- see
 * `etl/etl/gasto_partida.py` module docstring for the size-management
 * rationale. Every leaf carries `verified`: whether its own row satisfied
 * the report's arithmetic identities (Vigente = Aprobado + Modificaciones,
 * Devengado no pagado = Devengado - Pagado) -- never fabricated.
 */
export const gastoPartidaObjetoSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  vigenteArs: z.number(),
  devengadoArs: z.number(),
  pagadoArs: z.number(),
  verified: z.boolean(),
});

export const gastoPartidaProgramaSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  objetos: z.array(gastoPartidaObjetoSchema).min(1),
});

export const gastoPartidaJurisdiccionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  programas: z.array(gastoPartidaProgramaSchema).min(1),
});

export const gastoPartidaPeriodSchema = z.object({
  ejercicio: z.string().min(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().min(1),
});

/**
 * The build's own HONESTY GATE result (see `etl.gasto_partida.build_gasto_partida`):
 * the sum of every leaf's Vigente/Devengado/Pagado reconciled against the
 * PDF's own "TOTALES GENERALES" row. `reconciles` is always `true` for any
 * artifact that made it to `data/gasto-partida.json` (the ETL build raises
 * and refuses to write the file otherwise) -- kept in the schema/payload so
 * the web page can display the reconciliation as visible proof, not just
 * trust it silently.
 */
export const gastoPartidaReconciliationSchema = z.object({
  reconciles: z.boolean(),
  toleranceArs: z.number(),
  totalVigenteArs: z.number(),
  totalDevengadoArs: z.number(),
  totalPagadoArs: z.number(),
  sumLeafVigenteArs: z.number(),
  sumLeafDevengadoArs: z.number(),
  sumLeafPagadoArs: z.number(),
  diffVigenteArs: z.number(),
  diffDevengadoArs: z.number(),
  diffPagadoArs: z.number(),
  leafCount: z.number().nonnegative(),
  unverifiedLeafCount: z.number().nonnegative(),
});

export const gastoPartidaDataSchema = z.object({
  generatedAt: z.string().min(1),
  period: gastoPartidaPeriodSchema,
  reconciliation: gastoPartidaReconciliationSchema,
  sourceRefs: z.array(z.string().min(1)).min(1),
  jurisdicciones: z.array(gastoPartidaJurisdiccionSchema).min(1),
});

export type GastoPartidaObjeto = z.infer<typeof gastoPartidaObjetoSchema>;
export type GastoPartidaPrograma = z.infer<typeof gastoPartidaProgramaSchema>;
export type GastoPartidaJurisdiccion = z.infer<typeof gastoPartidaJurisdiccionSchema>;
export type GastoPartidaPeriod = z.infer<typeof gastoPartidaPeriodSchema>;
export type GastoPartidaReconciliation = z.infer<
  typeof gastoPartidaReconciliationSchema
>;
export type GastoPartidaData = z.infer<typeof gastoPartidaDataSchema>;
