/**
 * es-AR (Argentine Spanish) number and date formatting helpers.
 * Convention: thousands separator "." and decimal separator ",".
 * Large ARS amounts get explicit "millones"/"mil millones" wording per the
 * portal's institutional, plain-language style (never bare currency-style
 * digit strings for headline figures).
 */

const MILLION = 1_000_000;
const BILLION = 1_000_000_000;

const MONTH_NAMES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** Formats a plain integer ARS amount, e.g. `1716801481` -> `"$ 1.716.801.481"`. */
export function formatArsPlain(value: number): string {
  const rounded = Math.round(value);
  const grouped = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$ ${grouped}`;
}

function formatDecimalEsAr(value: number, fractionDigits: number): string {
  const [integerPart, fractionPart] = value.toFixed(fractionDigits).split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${groupedInteger},${fractionPart}`;
}

/**
 * Formats a headline ARS figure with explicit million/billion wording, e.g.
 * `6751250530` -> `"$ 6,75 mil millones"`, `1716801481` -> `"$ 1.716,80 millones"`.
 * Falls back to `formatArsPlain` below one million.
 */
export function formatArsCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= BILLION) {
    return `${sign}$ ${formatDecimalEsAr(abs / BILLION, 2)} mil millones`;
  }
  if (abs >= MILLION) {
    return `${sign}$ ${formatDecimalEsAr(abs / MILLION, 2)} millones`;
  }
  return formatArsPlain(value);
}

/**
 * Rounds a value to `sigFigs` significant figures, e.g. `roundToSignificantFigures(1753.71, 3) -> 1750`.
 */
function roundToSignificantFigures(value: number, sigFigs: number): number {
  if (value === 0) return 0;
  const magnitude = Math.floor(Math.log10(Math.abs(value))) + 1;
  const factor = Math.pow(10, magnitude - sigFigs);
  return Math.round(value / factor) * factor;
}

/**
 * Formats a headline/table ARS figure "human-rounded" to ~3 significant
 * figures, always in whole "millones" -- e.g. `1753712237.66` ->
 * `"$ 1.750 millones"`, never the more precise but harder-to-parse-at-a-
 * glance `"$ 1,75 mil millones"` that `formatArsCompact` would produce.
 * This is the primary display value for the hero figure and for tables;
 * `formatArsPlain`/`formatArsCompact` remain available for full-precision
 * display (e.g. a `title` attribute) alongside it. Falls back to
 * `formatArsPlain` below one million, same threshold as `formatArsCompact`.
 */
export function formatArsHuman(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs < MILLION) {
    return formatArsPlain(value);
  }
  const millones = abs / MILLION;
  const roundedMillones = Math.round(roundToSignificantFigures(millones, 3));
  const grouped = roundedMillones
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}$ ${grouped} millones`;
}

/**
 * Splits a `formatArsHuman`-formatted string into its numeric amount and
 * trailing unit word ("millones"/"mil millones"), for callers that want to
 * render the unit at a visually smaller/muted scale beside the amount
 * (e.g. the home hero figure card, DESIGN.md "refined card scale") while
 * still displaying the EXACT same value `formatArsHuman` produced -- this
 * never re-derives or rounds the number again, it only splits the string.
 * Returns `unit: null` (whole string as `amount`) below the one-million
 * threshold, where `formatArsHuman` falls back to plain peso formatting
 * with no unit word to split off.
 */
export function splitArsUnit(formatted: string): {
  amount: string;
  unit: string | null;
} {
  const match = formatted.match(/ (mil millones|millones)$/);
  if (!match) {
    return { amount: formatted, unit: null };
  }
  return { amount: formatted.slice(0, -match[0].length), unit: match[1] };
}

/** Formats a `"YYYY-MM"` period as `"mes de aaaa"`, e.g. `"2026-04"` -> `"abril de 2026"`. */
export function formatPeriodEsAr(period: string): string {
  const [year, month] = period.split("-");
  const monthName = MONTH_NAMES_ES[Number(month) - 1];
  return `${monthName} de ${year}`;
}

/** Formats an ISO `"YYYY-MM-DD"` date as `"D de mes de aaaa"`, e.g. `"14 de marzo de 2024"`. */
export function formatDateEsAr(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  const monthName = MONTH_NAMES_ES[Number(month) - 1];
  return `${Number(day)} de ${monthName} de ${year}`;
}

/**
 * Formats a fractional real (inflation-adjusted) variation, e.g. `0.032` ->
 * `"+3,2%"`, `-0.057` -> `"−5,7%"`. Always carries an explicit sign --
 * including a genuine `0` -- so a variation is never mistaken for an absolute
 * figure. Uses the true Unicode minus sign (U+2212), not a hyphen, per the
 * portal's mono/tabular data typography (design token `--stamp` colors the
 * negative case, `--olive` the non-negative one; this function only formats
 * the text, callers own the color).
 */
export function formatVariationEsAr(
  fraction: number,
  fractionDigits = 1,
): string {
  const percent = fraction * 100;
  const sign = percent < 0 ? "−" : "+";
  const formatted = formatDecimalEsAr(Math.abs(percent), fractionDigits);
  return `${sign}${formatted}%`;
}

/**
 * Formats a `FalloRecord.fineArs` value (`number | null`) for display.
 * `null` means no monetary fine was reported for that official/ejercicio
 * and MUST render a distinct, explicit marker -- never `"$ 0"`, which
 * would misrepresent "no fine" as "a fine of exactly zero pesos". Uses the
 * human-rounded form (`formatArsHuman`) since the fine is displayed as a
 * headline-style figure on `FalloCard`, same convention as the home hero.
 */
export function formatFineArs(fineArs: number | null): string {
  if (fineArs === null) {
    return "sin multa monetaria";
  }
  return formatArsHuman(fineArs);
}
