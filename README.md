# ¿Dónde va la plata? — Coronel Rosales

[![CI](https://github.com/NicolasIppoliti/dondevalaplata/actions/workflows/ci.yml/badge.svg)](https://github.com/NicolasIppoliti/dondevalaplata/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](./LICENSE)

Sitio en producción: **<https://dondevalaplata.vercel.app>**

Portal ciudadano e independiente que reúne datos públicos del partido de
Coronel Rosales (Provincia de Buenos Aires) — coparticipación municipal y
fallos del Tribunal de Cuentas — a partir de fuentes oficiales, para que
cualquier vecino o vecina pueda verificarlos por sí mismo/a.

## Qué es este portal

Toma datos que ya son públicos pero están dispersos en portales oficiales,
los ordena, los ajusta por inflación cuando corresponde y los presenta con
gráficos y tablas accesibles. Cada cifra que se muestra enlaza a su **fuente
original** y a una **copia archivada** del documento fuente, para que la
información sobreviva aunque la página oficial cambie o el dato deje de estar
disponible.

No pertenece a ningún partido político ni recibe financiamiento de
campañas. La información se presenta con el mismo criterio y el mismo nivel
de detalle sin importar qué gestión municipal esté involucrada — ver la
declaración completa de neutralidad en [`/acerca`](https://dondevalaplata.vercel.app/acerca).

## Qué datos muestra y de dónde salen

| Dato | Fuente oficial |
|---|---|
| Coparticipación municipal (Coronel Rosales y municipios vecinos) | [`catalogo.datos.gba.gob.ar`](https://catalogo.datos.gba.gob.ar) |
| Fallos del Tribunal de Cuentas (HTC) 2022–2024 | Boletín SUMMUN del Honorable Tribunal de Cuentas de la Provincia de Buenos Aires |
| Índice de precios al consumidor (IPC), usado para ajustar montos por inflación | INDEC, vía la API `series-tiempo` de [`datos.gob.ar`](https://datos.gob.ar) |

Cada archivo fuente se descarga, se le calcula un hash `sha256` y se sube a
un bucket de Cloudflare R2 como copia canónica (`archived_url`), quedando
registrado en [`archive-manifest.json`](./archive-manifest.json). Ese
manifiesto es la columna vertebral de todo el proyecto: cualquier cifra
mostrada en el sitio referencia un `id` de manifiesto que resuelve tanto al
enlace original como al archivado — si alguno no resuelve, el build falla.
El detalle completo, con el índice de archivo, está en
[`/fuentes`](https://dondevalaplata.vercel.app/fuentes).

## Metodología (resumen)

Los montos de coparticipación se ajustan por inflación usando el IPC Nivel
General Nacional publicado por INDEC, expresados en pesos constantes del
último mes disponible de la serie. El ajuste se calcula una sola vez en el
pipeline de ETL (nunca en el navegador) y se versiona junto con los datos.
La explicación completa — serie utilizada, mes base, y por qué la cifra
destacada es la suma de todos los conceptos de la planilla oficial — está en
[`/fuentes`](https://dondevalaplata.vercel.app/fuentes).

## Estructura del monorepo

```
.
├── apps/web/              # Sitio Next.js (App Router, SSG, sin runtime de servidor)
│   ├── app/               # Rutas: /, /coparticipacion, /fallos, /fallos/[ejercicio], /fuentes, /acerca
│   ├── components/        # Gráficos SVG, tablas accesibles, header/footer
│   ├── lib/                # Loader con validación zod, resolver de fuentes
│   └── tests/              # Vitest
├── etl/                   # Pipeline Python (uv) — único componente con acceso a red
│   ├── etl/               # CLI (archive, build-ipc, build-coparticipacion, build-fallos, sync-r2)
│   ├── sources.yaml        # Registro de fuentes oficiales
│   └── tests/               # pytest
├── data/                   # JSON de salida del ETL, consumido por el sitio en build time
├── archive/                 # Mirror local de documentos chicos (no versionado en git)
├── archive-manifest.json    # Manifiesto de procedencia (fuente + copia archivada + sha256)
└── .github/workflows/       # CI (push/PR) y refresco mensual de datos (cron)
```

## Cómo correrlo localmente

### Sitio web (`apps/web`)

Requiere Node.js 22+.

```bash
cd apps/web
npm ci
npm run dev        # http://localhost:3000
npm run lint
npm test
npm run build
```

El sitio lee directamente los archivos ya generados en `data/` y
`archive-manifest.json` — no hace falta correr el ETL para levantarlo.

### Pipeline de ETL (`etl`)

Requiere Python 3.13+ y [`uv`](https://docs.astral.sh/uv/).

```bash
cd etl
uv sync
uv run etl --help
uv run pytest -q
uv run ruff check .
```

Para correr `etl archive` o `etl sync-r2` localmente (descarga real desde las
fuentes oficiales y subida a Cloudflare R2) hace falta configurar las
credenciales de R2 — ver [`etl/.env.example`](./etl/.env.example). El resto
de los subcomandos (`build-ipc`, `build-coparticipacion`, `build-fallos`) son
deterministas, no tocan la red y corren sólo contra lo ya archivado
localmente.

## Automatización (CI/CD)

- **CI** (`.github/workflows/ci.yml`): en cada push a `main` y en cada pull
  request corre lint, chequeo de tipos, tests y build del sitio, más lint
  (`ruff`) y tests (`pytest`) del ETL.
- **Refresco mensual de datos** (`.github/workflows/etl-monthly.yml`): el día
  5 de cada mes vuelve a archivar todas las fuentes y reconstruye los datos
  publicados; si hay cambios, los commitea automáticamente, lo que dispara
  el mismo CI y un nuevo deploy en Vercel. También se puede disparar a mano.

## Corrección de errores

Este es un proyecto cívico independiente, construido con datos y
metodología abiertos — no hay pretensión de infalibilidad. Si encontrás un
error, un dato desactualizado o una fuente rota, por favor abrí un
[issue](https://github.com/NicolasIppoliti/dondevalaplata/issues) o una pull
request señalando el dato y, si es posible, la fuente oficial correcta.

## Licencia

[MIT](./LICENSE) © 2026 Nicolás Ippoliti
