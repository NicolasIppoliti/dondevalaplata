import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-slate-600">
        <p>
          Portal ciudadano independiente, sin fines partidarios. Cada dato
          publicado enlaza a su fuente oficial y a una copia archivada. Ver{" "}
          <Link href="/acerca" className="underline underline-offset-2">
            declaración de neutralidad
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
