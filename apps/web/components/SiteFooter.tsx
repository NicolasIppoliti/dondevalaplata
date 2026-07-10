import Link from "next/link";

/**
 * IA consolidation ("4 puertas", DESIGN.md decisions log entry "I1"):
 * Fuentes and Acerca de moved out of SiteHeader's primary nav (now 4 doors
 * only) into a real footer nav landmark -- previously "Acerca de" was only
 * reachable via the prose "declaración de neutralidad" link below, and
 * "Fuentes" had no footer presence at all outside the primary nav it just
 * lost. The prose link stays (same wording, still useful in reading flow),
 * it just no longer is the ONLY way to reach either route from the footer.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-[1080px] px-5 py-9 font-mono text-[13px] text-muted">
        <nav
          aria-label="Pie de página"
          className="mb-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px]"
        >
          <Link href="/fuentes">Fuentes</Link>
          <Link href="/acerca">Acerca de</Link>
        </nav>
        <p className="max-w-[62ch]">
          ¿Dónde va la plata? — Coronel Rosales. Desarrollado por Fragua, un
          estudio de software, como un proyecto cívico independiente y sin
          fines partidarios. Cada dato publicado enlaza a su fuente oficial
          y a una copia archivada. Ver{" "}
          <Link href="/acerca">declaración de neutralidad</Link>.
        </p>
      </div>
    </footer>
  );
}
