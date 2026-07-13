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
  /** Whether the dimension's underlying document series is CURRENTLY
   * published on time (see `etl.cadencia.CAUGHT_UP_LAG_MONTHS_TOLERANCE`) --
   * independent of `got`/`max`, which stay frozen to the last curated ASAP
   * report (never re-derived here). A dimension can be `caughtUp: true`
   * while still showing `got < max`, meaning ASAP has not yet re-scored a
   * publication the municipality already made. Optional so older cadencia
   * payloads/fixtures built before this field existed keep parsing
   * (treated as "unknown", never as a stale claim). */
  caughtUp: z.boolean().optional(),
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

/**
 * Feature G3: SIBOM adjudicaciones monitor. Every row is a single
 * ADJUDICACIÓN decision (vendor + amount) parsed from a Departamento
 * Ejecutivo decreto published in the Boletín Oficial Municipal
 * (sibom.slyt.gba.gob.ar/cities/28) -- the only public source that names a
 * vendor alongside an exact amount (`etl/etl/sibom_adjudicaciones.py`).
 * `sourceRef` resolves to its own individually-archived act page (never the
 * whole bulletin), so every row's provenance is the SPECIFIC decreto text
 * it was extracted from. `montoArs` and `expediente`/`procedimiento` are
 * only ever populated when unambiguously extracted -- see the ETL module
 * docstring for the "never fabricate, skip on ambiguity" correctness gate
 * (spelled-vs-numeric amount cross-validation).
 */
export const adjudicacionRecordSchema = z.object({
  decreto: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expediente: z.string().min(1).nullable(),
  proveedor: z.string().min(1),
  montoArs: z.number().positive(),
  procedimiento: z.string().min(1).nullable(),
  objeto: z.string().min(1),
  bulletinNumber: z.number().positive(),
  sourceRef: z.string().min(1),
});

export const adjudicacionesDataSchema = z.object({
  generatedAt: z.string().min(1),
  windowFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  windowTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  bulletinsScanned: z.number().nonnegative(),
  decreesScanned: z.number().nonnegative(),
  skippedCount: z.number().nonnegative(),
  sourceRefs: z.array(z.string().min(1)),
  records: z.array(adjudicacionRecordSchema),
});

export type AdjudicacionRecord = z.infer<typeof adjudicacionRecordSchema>;
export type AdjudicacionesData = z.infer<typeof adjudicacionesDataSchema>;

/**
 * Feature G3: the reconstructed proveedores padrón -- an aggregate of every
 * adjudicaciones row grouped by vendor (`etl.sibom_adjudicaciones.build_proveedores`).
 * "Reconstructed" because the municipality's own official padrón is behind a
 * login wall, which Ordenanza 3638 Art. 11 requires to be public; this view
 * exists ONLY because that data is otherwise unavailable, not as a
 * replacement for it. `decretoRefs` lets the UI filter the adjudicaciones
 * table down to one vendor's own rows -- the only place per-row provenance
 * (sha256, archived copy) lives, matching the "expand to see the sourced
 * components" pattern already used for aggregate figures on this site.
 */
export const proveedorRecordSchema = z.object({
  proveedor: z.string().min(1),
  totalArs: z.number().positive(),
  count: z.number().positive(),
  firstDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  decretoRefs: z.array(z.string().min(1)).min(1),
});

export const proveedoresDataSchema = z.object({
  generatedAt: z.string().min(1),
  proveedores: z.array(proveedorRecordSchema),
});

export type ProveedorRecord = z.infer<typeof proveedorRecordSchema>;
export type ProveedoresData = z.infer<typeof proveedoresDataSchema>;

/**
 * Feature G4: the pedidos de acceso a la información tracker. Unlike every
 * other `data/*.json` artifact, this is NOT produced by the ETL from an
 * archived external source -- it is a small, hand-edited file the portal
 * owner updates himself whenever he files a pedido under Ordenanza 3638 or
 * receives a response. There is no `sourceRefs`/manifest provenance here on
 * purpose (see `lib/sources.ts`'s docstring on why `pedidos` is excluded
 * from `collectSourceRefs`/`assertSourceRefsResolve`): a self-authored
 * tracking record isn't a claim about an external official document, so
 * INVIOLABLE #2 (dual-link + sha256 provenance) doesn't apply to it the way
 * it does to every other headline figure on the site. `expediente` is
 * required (not nullable) because, per Ordenanza 3638 Art. 6, Mesa de
 * Entradas stamps a cargo with a expediente number at the moment of filing
 * -- a pedido only belongs in this tracker once that has happened.
 * `fechaRespuesta`/`respuestaUrl` are optional and only meaningful once
 * `estado` is `"respondido"`.
 */
export const pedidoEstadoSchema = z.enum(["presentado", "respondido", "vencido"]);

export const pedidoRecordSchema = z.object({
  objeto: z.string().min(1),
  fechaPresentado: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expediente: z.string().min(1),
  estado: pedidoEstadoSchema,
  fechaRespuesta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  respuestaUrl: z.string().min(1).optional(),
  notas: z.string().optional(),
});

export const pedidosDataSchema = z.object({
  generatedAt: z.string().min(1),
  pedidos: z.array(pedidoRecordSchema),
});

export type PedidoEstado = z.infer<typeof pedidoEstadoSchema>;
export type PedidoRecord = z.infer<typeof pedidoRecordSchema>;
export type PedidosData = z.infer<typeof pedidosDataSchema>;

/**
 * Feature H2a: the deuda pública histórica quarterly series
 * (`etl/etl/deuda_historica.py`, `data/deuda-historica.json`) -- the three
 * quarters the municipality ever published (1er/2do/3er trimestre 2025)
 * before it stopped. `totalArs` is the ONLY figure this schema carries per
 * quarter -- deliberately no composition breakdown, see the ETL module
 * docstring for why a per-organismo-acreedor split could not be reconciled
 * against the headline total and was dropped rather than guessed.
 */
export const deudaHistoricaPointSchema = z.object({
  period: z.string().regex(/^\d{4}-Q[1-4]$/),
  periodLabel: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalArs: z.number().nonnegative(),
  sourceRef: z.string().min(1),
});

export const deudaHistoricaDataSchema = z.object({
  generatedAt: z.string().min(1),
  series: z.array(deudaHistoricaPointSchema).min(1),
  sourceRefs: z.array(z.string().min(1)).min(1),
});

export type DeudaHistoricaPoint = z.infer<typeof deudaHistoricaPointSchema>;
export type DeudaHistoricaData = z.infer<typeof deudaHistoricaDataSchema>;

/**
 * Feature H3a: the Censo 2022 population per municipio
 * (`etl/etl/poblacion.py`, `data/poblacion-censo-2022.json`) -- the sourced
 * denominator for the `/coparticipacion` per-cápita comparison (the honest
 * fix for comparing coparticipación in absolute pesos across municipios of
 * very different size, see DESIGN.md's decision log entry for D8/H3).
 * `poblacion` is a single point-in-time constant per municipio (the census
 * has no monthly series); every `coparticipacion` period for that
 * municipio divides by the SAME figure.
 */
export const poblacionCensoMunicipioSchema = z.object({
  municipioId: z.string().min(1),
  municipio: z.string().min(1),
  poblacion: z.number().positive(),
});

export const poblacionCensoDataSchema = z.object({
  generatedAt: z.string().min(1),
  censusYear: z.number().int(),
  sourceRefs: z.array(z.string().min(1)).min(1),
  municipios: z.array(poblacionCensoMunicipioSchema).min(1),
});

export type PoblacionCensoMunicipio = z.infer<
  typeof poblacionCensoMunicipioSchema
>;
export type PoblacionCensoData = z.infer<typeof poblacionCensoDataSchema>;

/**
 * Feature H2b: the watchdog "novedades" publication-behavior log
 * (`etl/etl/novedades.py`, `data/novedades.json`). Every event carries an
 * explicit `kind` so the UI always labels which events are hand-curated
 * ("seeded"), diffed live from two archived listing snapshots
 * ("auto-detected", append-only), or re-derived every build from
 * `data/cadencia.json`'s own numbers ("auto-stale") -- see the ETL module
 * docstring for the full honesty rationale. `date`/`detail` are nullable:
 * an `auto-detected` event always has a date, but a dimension with no
 * `lastPublishedAt` yet (see `derive_stale_events`) legitimately has none,
 * and `detail` is optional prose, never fabricated when absent.
 */
export const novedadKindSchema = z.enum(["seeded", "auto-detected", "auto-stale"]);

export const novedadEventSchema = z.object({
  id: z.string().min(1),
  kind: novedadKindSchema,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  title: z.string().min(1),
  detail: z.string().min(1).nullable(),
  sourceRefs: z.array(z.string().min(1)),
});

export const novedadesDataSchema = z.object({
  generatedAt: z.string().min(1),
  events: z.array(novedadEventSchema),
  sourceRefs: z.array(z.string().min(1)),
});

export type NovedadKind = z.infer<typeof novedadKindSchema>;
export type NovedadEvent = z.infer<typeof novedadEventSchema>;
export type NovedadesData = z.infer<typeof novedadesDataSchema>;

/**
 * Feature titularidad: per-vendor "titularidad registral" (company
 * ownership) -- the HIGHEST LEGAL-RISK data this portal publishes. Read
 * DESIGN.md's titularidad decision entry and `etl/etl/titularidad.py`'s
 * module docstring before touching this schema.
 *
 * MINIMIZATION (Ley 25.326 art. 4, principio de finalidad) IS ENFORCED BY
 * THIS SCHEMA ITSELF: `titularidadSocioSchema` has exactly two fields,
 * `nombre` and `rol` -- there is no field for DNI, domicilio particular,
 * fecha de nacimiento or estado civil. Even if that PII were ever
 * accidentally added upstream (`data/titularidad.json`), zod's default
 * `.object()` behavior strips unknown keys on parse, so it could never
 * cross this build-time boundary into a rendered page.
 *
 * `rol` is restricted to the only roles this portal ever publishes
 * (matches `etl.titularidad.ALLOWED_ROLES`). `vendorMatchKeys` is an
 * EXPLICIT list of exact proveedor-name strings this record applies to
 * (e.g. both "EQUIPO..."/"EQUIPOS..." spellings for the same real
 * entity) -- resolution is always exact-match, never fuzzy (see
 * `lib/titularidad.ts::resolveTitularidad`).
 */
export const titularidadRolSchema = z.enum(["socio", "socio gerente", "director"]);

export const titularidadSocioSchema = z.object({
  nombre: z.string().min(1),
  rol: titularidadRolSchema,
});

export const titularidadRecordSchema = z.object({
  empresa: z.string().min(1),
  vendorMatchKeys: z.array(z.string().min(1)).min(1),
  tipo: z.string().min(1),
  cuitEmpresa: z.string().min(1).nullable(),
  socios: z.array(titularidadSocioSchema).min(1),
  fuenteEdictoUrl: z.string().min(1),
  edicionFecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  edicionLabel: z.string().min(1),
  instrumentoFecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  instrumentoLabel: z.string().min(1),
  sourceRef: z.string().min(1),
});

export const titularidadDataSchema = z.object({
  generatedAt: z.string().min(1),
  sourceRefs: z.array(z.string().min(1)),
  records: z.array(titularidadRecordSchema),
});

export type TitularidadRol = z.infer<typeof titularidadRolSchema>;
export type TitularidadSocio = z.infer<typeof titularidadSocioSchema>;
export type TitularidadRecord = z.infer<typeof titularidadRecordSchema>;
export type TitularidadData = z.infer<typeof titularidadDataSchema>;
