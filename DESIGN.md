# Sistema de Diseño — "El Recibo del Municipio"

Fuente de verdad de diseño de **¿Dónde va la plata? — Coronel Rosales**.
Todo cambio visual o de UI se decide acá. No desviarse sin aprobación explícita del dueño del proyecto.

## Contexto de producto

- **Qué es:** portal cívico de transparencia — muestra cuánta plata recibe y gasta el municipio de Coronel Rosales, con fuentes oficiales archivadas y verificables (sha256).
- **Para quién:** vecinos comunes, no técnicos, mayormente en Android de gama media/baja, de día y al sol.
- **Tipo de proyecto:** sitio editorial de datos (más diario que dashboard). Estático, sin JS en las cifras.
- **Tensión de marca:** la marca es una pregunta filosa; el contenido es estrictamente neutral. La forma grita, el contenido no.
- **Lo memorable (gobierna todo):** *"acá están los números que nadie muestra"* — el número es el protagonista, tratado como titular de diario.

## Dirección estética

- **Dirección:** editorial-documental — "tapa de diario impresa en papel de recibo". Ni SaaS, ni gobierno digital (anti-referente: presupuestoabierto.gob.ar y sus tarjetas arcoíris).
- **Nivel de decoración:** mínimo — la tipografía y el número hacen todo el trabajo. Si algo no es número, tabla o texto, no entra.
- **Mood:** algo que se puede *chequear*, no algo que hay que *admirar*. "Parece el recibo que me clavaron a mí — pero de la municipalidad."
- **Referentes:** ProPublica (seriedad editorial), Chequeado (display gigante como marca de sección), OWID (gráfico+tabla).

## Tipografía

| Rol | Fuente | Regla |
|---|---|---|
| Display / titulares-pregunta | **Fraunces** (variable, opsz alto, 600–700) | Los títulos de sección son PREGUNTAS ("¿Cuánto llegó este mes?") |
| Body / UI | **Instrument Sans** (400–700) | Workhorse; todo texto corrido y controles |
| Datos | **Spline Sans Mono** + `font-variant-numeric: tabular-nums` | TODO monto, fecha, porcentaje y hash — sin excepción |
| Citas de fallos | **Newsreader** itálica (opsz 6–72) | Solo para texto citado textual de documentos oficiales |

- **Carga:** `next/font/google` (self-hosted en build — cero requests externos en runtime). Subsetear pesos: Fraunces 600/700 + italic 400; Instrument Sans 400/500/600/700; Spline Sans Mono 400/600; Newsreader italic 400.
- **Escala:** body 17px/1.55 · display `clamp(26px, 4vw, 44px)` · h1 de página `clamp(26px, 4vw, 40px)` · número-héroe del home `clamp(52px, 11vw, 128px)` line-height 0.95 · caption/meta 12–13px mono.

## Color

| Token | Hex | Uso |
|---|---|---|
| `--paper` | `#F2EFE4` | Fondo global (papel crudo — menos fatiga al sol que blanco puro) |
| `--surface` | `#FFFDF7` | Tarjetas / frames sobre el papel |
| `--ink` | `#1A1A17` | Texto primario (tinta) |
| `--muted` | `#6B6558` | Texto secundario — **solo en cuerpos ≥16px o mono ≥12px** (límite AA) |
| `--stamp` | `#C4361E` | Acento único: subrayado de links, kickers, signo de la marca. Rojo sello administrativo, NO rojo alarma |
| `--olive` | `#2F5D3A` | Subas reales (por encima de inflación) |
| `--ocre` | `#F2D9A8` | Resaltado documental (fallos, marcador "escaneado"). Resalta, no juzga |
| `--rule` | `#D8D2C0` | Filetes, bordes, grillas de gráfico |

- **Caídas reales:** `--stamp` (mismo rojo del acento; en contexto de tabla/serie se lee como negativo).
- **Regla de neutralidad cromática (INVIOLABLE):** jamás un color que "opine" sobre una gestión, partido o funcionario. Sin semáforos buena/mala gestión. Verde/rojo solo para variación aritmética real de una serie.
- **Dark mode: NO — doctrina, no omisión.** El recibo de papel no tiene modo oscuro. Un solo sistema cromático, bien hecho.

## Espaciado y layout

- **Base:** 4px. Escala: 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64). Densidad: comfortable.
- **Layout:** columna única mobile-first; contenido de lectura máx ~62ch; contenedor máx 1080px.
- **Home = afiche, no landing:** el monto del último mes domina el fold (mono gigante), variación con signo en chip bordeado, pregunta itálica en Newsreader debajo, luego filas de sección (pregunta Fraunces + link mono "ver → "). Sin hero copy de marketing, sin carruseles.
- **Border-radius: 0 en todo.** El recibo es recto. Sin sombras difusas; profundidad = filetes (`--rule`) y bordes de 1–2px.
- **Navegación:** header con filete inferior de 2–3px `--ink` (cabecera de diario). Links subrayados con `text-decoration-color: var(--stamp)`, offset 3px, grosor 2px.

## Componentes canónicos

- **Botones:** rectos, borde 2px. Primario: fondo `--ink` texto `--surface`. Secundario: transparente borde `--ink`. Énfasis fuente-oficial: fondo `--stamp`.
- **Chip de frescura:** borde discontinuo (`dashed`) `--muted`, mono 12px, fondo `--paper` — "datos hasta abril 2026 — la Provincia publica con 2 a 3 meses de rezago".
- **Tarjeta de fallo:** superficie con borde `--rule` + **borde izquierdo 6px `--ocre`**; año/fecha en mono uppercase; nombre en Fraunces; multa en mono 26px; cita en Newsreader itálica; línea de procedencia en mono 11.5px con doble link (oficial + archivo) + sha256 corto. **Template idéntico para toda gestión** — la neutralidad es estructural. Fallo escaneado: badge ocre "documento escaneado — texto no extraído".
- **Gráficos:** SVG server-rendered, cero JS. Serie constante en `--olive` 3px; serie nominal punteada `--muted` 1.5px; grilla `--rule` discontinua; labels mono 11px; último punto marcado con valor. Siempre acompañado de tabla accesible (caption mono uppercase, th filete 2px `--ink`, números `tabular-nums` alineados a derecha).
- **Alerts:** superficie + borde izquierdo 5px (oliva=dato nuevo, ocre=aviso documental, sello=fuente caída).
- **Cifras es-AR:** miles con punto, decimales con coma; "$ 1.548 millones"; toda cifra ajustada declara al lado o al pie: "en pesos constantes de mayo 2026 (IPC INDEC)".

## Motion

- **Enfoque:** mínimo-funcional. CSS puro (`transition` 150–250ms ease-out en hover/focus de links y botones). Nada de animación de entrada, scroll-driven ni parallax.

## Accesibilidad

- AA mínimo en todo par texto/fondo (muted solo ≥16px). Focus visible: outline 2px `--stamp`. Lighthouse a11y ≥ 90 (hoy: 100 — no retroceder).

## Registro de decisiones

| Fecha | Decisión | Racional |
|---|---|---|
| 2026-07-07 | Sistema "El Recibo del Municipio" creado | /design-consultation: research visual (ProPublica, Chequeado, OWID, Presupuesto Abierto como anti-referente) + voz de diseño independiente ciega. Memorable elegido por el dueño: "acá están los números que nadie muestra". |
| 2026-07-07 | Sin dark mode (doctrina) | Metáfora material del recibo + audiencia diurna en Android de gama baja + un solo sistema cromático bien hecho. |
| 2026-07-07 | Descartados "sellos rotados" clicables | Propuesta de la voz independiente; rompe affordance para audiencia no técnica. Disponible como exploración futura. |
