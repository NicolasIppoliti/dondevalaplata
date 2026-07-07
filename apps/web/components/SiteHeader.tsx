import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Inicio" },
  { href: "/coparticipacion", label: "Coparticipación" },
  { href: "/fallos", label: "Fallos HTC" },
  { href: "/fuentes", label: "Fuentes" },
  { href: "/acerca", label: "Acerca de" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-slate-900 hover:text-slate-700"
        >
          ¿Dónde va la plata?
          <span className="sr-only"> — Coronel Rosales</span>
        </Link>
        <nav aria-label="Navegación principal">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
