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
