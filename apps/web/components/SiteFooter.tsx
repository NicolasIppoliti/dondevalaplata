import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-[1080px] px-5 py-9 font-mono text-[13px] text-muted">
        <p className="max-w-[62ch]">
          ¿Dónde va la plata? — Coronel Rosales. Portal ciudadano
          independiente, sin fines partidarios. Cada dato publicado enlaza a
          su fuente oficial y a una copia archivada. Ver{" "}
          <Link href="/acerca">declaración de neutralidad</Link>.
        </p>
      </div>
    </footer>
  );
}
