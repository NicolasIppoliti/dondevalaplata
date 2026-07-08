# Sistema de Diseño — "Dashboard cívico premium" (sobre ADN "El Recibo del Municipio")

Fuente de verdad de diseño de **¿Dónde va la plata? — Coronel Rosales**.
Todo cambio visual o de UI se decide acá. No desviarse sin aprobación explícita del dueño del proyecto.

**v2 (2026-07-07, aprobado por el dueño del proyecto):** rediseño moderno/interactivo.
Base = Dirección A "Dashboard cívico premium" (contención tipo Linear/Stripe, mantiene el ADN
papel+tinta+sello), injertando las piezas mobile de la Dirección C (bottom tab-bar, bottom-sheet,
explicador "Cómo leer los colores"). Ver el registro de decisiones al final para el detalle de
qué cambió, por qué, y qué **NO** cambió. Las reglas marcadas **INVIOLABLE** sobreviven este y
cualquier rediseño futuro sin excepción.

## Reglas INVIOLABLES (sobreviven todo rediseño)

Estas reglas NO se relajan con este ni ningún rediseño futuro sin una nueva aprobación explícita
y documentada del dueño del proyecto:

1. **Neutralidad cromática.** Un color jamás "opina" sobre una gestión, partido o funcionario.
   Verde/rojo **solo** para variación aritmética real de una misma serie en el tiempo, y
   **siempre** acompañados de una marca ▲/▼ — nunca color solo (WCAG 1.4.1, uso de color). Toda
   tabla con celdas en rojo lleva la leyenda "En rojo: cayó respecto del período anterior." Ver
   componente "Cómo leer los colores" (Dirección C), ahora reusable en todo el sitio.
2. **Procedencia verificable.** Toda cifra titular muestra fuente + "copia archivada" + sha256
   corto. Si un dato no tiene esas tres cosas, no se publica.
3. **es-AR en copy visible; inglés en código.** Identificadores, comentarios y nombres de
   componentes en inglés; toda copia visible al usuario en español rioplatense.
4. **Datos en build-time.** Ninguna cifra se pide en runtime. La interactividad son islas de
   cliente chicas y puntuales (drawer, count-up, scroll-reveal, tema, nav activo mobile) — nunca
   una librería de gráficos pesada ni un fetch de datos en el navegador.
5. **Accesibilidad ≥ 90 (objetivo 100).** Todo elemento interactivo operable por teclado,
   focus-visible siempre encendido, `prefers-reduced-motion` respetado por cada primitiva de
   motion, jerarquía de encabezados intacta.

## Contexto de producto

- **Qué es:** portal cívico de transparencia — muestra cuánta plata recibe y gasta el municipio de Coronel Rosales, con fuentes oficiales archivadas y verificables (sha256).
- **Para quién:** vecinos comunes, no técnicos, mayormente en Android de gama media/baja, de día y al sol.
- **Tipo de proyecto (v2):** producto de datos interactivo con ADN editorial — el dato sigue
  siendo protagonista (titular de diario), pero ahora vive en un shell de app moderno (header
  sticky, bottom-nav mobile, drawers) en vez de una página de diario 100% estática. Los datos
  siguen siendo build-time; lo que cambia es la capa de interacción (islas de cliente chicas), no
  la fuente de la verdad.
- **Tensión de marca:** la marca es una pregunta filosa; el contenido es estrictamente neutral. La forma grita, el contenido no.
- **Lo memorable (gobierna todo):** *"acá están los números que nadie muestra"* — el número es el protagonista, tratado como titular de diario.

## Dirección estética

- **Dirección (v2):** "dashboard cívico premium" — contención tipo producto de datos serio
  (Linear/Stripe), sobre la MISMA base papel+tinta+sello (nunca SaaS genérico, nunca gobierno
  digital — anti-referente sigue siendo presupuestoabierto.gob.ar y sus tarjetas arcoíris). En
  mobile, injerta el lenguaje de app de la Dirección C: tarjetas más redondeadas, bottom tab-bar,
  bottom-sheet.
- **Nivel de decoración (v2, relajado):** la tipografía y el número siguen haciendo la mayoría
  del trabajo, pero ahora se permite elevación sutil (sombras suaves, nunca "vidrio flotante"),
  radios modestos y micro-motion con propósito (conteo, revelado al scroll, drawer). Sigue sin
  entrar decoración puramente ornamental (ilustraciones, gradientes de marca, iconografía
  decorativa sin función).
- **Mood:** algo que se puede *chequear*, no algo que hay que *admirar*. "Parece el recibo que me clavaron a mí — pero de la municipalidad", ahora en una app que se siente cuidada y rápida.
- **Referentes:** ProPublica (seriedad editorial), Chequeado (display gigante como marca de sección), OWID (gráfico+tabla), + Linear/Stripe (restricción de un dashboard de producto moderno) y la Dirección C interna (mobile app-feel).

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

| Token | Hex (light) | Hex (dark) | Uso |
|---|---|---|---|
| `--paper` | `#F2EFE4` | `#17150F` | Fondo global |
| `--paper-2` | `#ECE7D8` | `#1C1912` | Fondo de zonas secundarias (footer) |
| `--surface` | `#FFFDF7` | `#201D15` | Tarjetas / frames sobre el papel |
| `--surface-2` | `#F8F4E9` | `#262218` | Superficie elevada dos niveles (hover de fila, chips) |
| `--ink` | `#1A1A17` | `#F3EFE4` | Texto primario |
| `--ink-2` | `#43413A` | `#D3CDBC` | Texto secundario de mayor peso que `--muted` |
| `--muted` | `#6B6558` | `#9A9284` | Texto terciario — **solo en cuerpos ≥16px o mono ≥12px** (límite AA), en ambos temas |
| `--stamp` | `#C4361E` | `#E77A63` | Acento único: subrayado de links, kickers, signo de la marca, caídas aritméticas. Rojo sello administrativo, NO rojo alarma |
| `--olive` | `#2F5D3A` | `#7CBF8B` | Subas aritméticas reales (por encima de inflación) |
| `--ocre` | `#F2D9A8` | `#E6C583` | Resaltado documental (fallos, marcador "escaneado", ítem pendiente). Resalta, no juzga |
| `--rule` | `#D8D2C0` | `#38342A` | Filetes, bordes, grillas de gráfico |

- **Caídas reales:** `--stamp` (mismo rojo del acento; en contexto de tabla/serie se lee como negativo). **INVIOLABLE**: siempre acompañado de una marca ▲/▼, nunca color solo (WCAG 1.4.1).
- **Regla de neutralidad cromática (INVIOLABLE):** jamás un color que "opine" sobre una gestión, partido o funcionario. Sin semáforos buena/mala gestión. Verde/rojo solo para variación aritmética real de una serie. Ver `ColorLegend` ("Cómo leer los colores").
- **Elevación (v2, nuevo):** sombras suaves de "papel elevado", nunca vidrio flotante genérico — `--shadow-card` (tarjetas), `--shadow-control` (botones/chips), `--shadow-header` (header al hacer scroll). Siempre de bajo contraste; la profundidad principal sigue siendo los filetes (`--rule`), la sombra es un acento adicional, no el mecanismo primario.
- **Dark mode (v2, relajado — antes doctrina "NO"):** paleta charcoal cálida, saturación reducida (ver tabla), **opcional** vía `ThemeToggle` (persistido en `localStorage`, nunca sigue `prefers-color-scheme` del SO). **Light sigue siendo el DEFAULT** para todo visitante nuevo. Racional del cambio: la doctrina original ("el recibo de papel no tiene modo oscuro") seguía siendo válida estéticamente, pero el dueño priorizó una app que se sienta moderna incluso de noche/en modo oscuro del sistema operativo del visitante, sin forzarlo — de ahí que sea opt-in explícito y no automático. Aprobado por el dueño 2026-07-07.

## Espaciado y layout

- **Base:** 4px. Escala: 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64). Densidad: comfortable.
- **Layout:** columna única mobile-first; contenido de lectura máx ~62ch; contenedor máx 1080px.
- **Home hero mobile (v2.3, fidelidad a Mockup C -- ver decisión F3 abajo): tarjeta
  compacta tipo app, la tarjeta lidera, no la columna editorial.** Por debajo de `lg`,
  la tarjeta (misma tarjeta del desktop, reordenada vía `order` CSS -- nunca duplicada
  en el DOM) lidera visualmente: pill "independiente" arriba de la cifra, cifra a
  escala reducida (`clamp(32px,9.5vw,44px)`, restaurada a la escala de tarjeta original
  desde `lg`), el mismo chip de variación + procedencia dual-link/sha256 sin cambios.
  Encima de la tarjeta, una única línea de apoyo (lede) reemplaza la columna editorial
  completa (kicker + titular Fraunces + párrafo + dos CTA), que pasa a `hidden lg:block`
  -- el chip de frescura es la única pieza de esa columna que se mantiene visible en
  todo breakpoint. Debajo de la tarjeta, una lista de filas de acceso rápido (ícono +
  pregunta + valor + chevron, agrupadas en una tarjeta redondeada) resume los tres
  destinos principales. Ver decisión F3 para el detalle completo y el racional de no
  duplicar ningún nodo de texto.
- **Home hero (v2.1, fidelidad a Mockup A -- ver decisión F1 abajo): DOS COLUMNAS en
  desktop, una tarjeta flotante premium, no más el afiche de un solo número gigante.**
  Columna izquierda (editorial): kicker mono "Portal vecinal independiente", titular
  Fraunces "Seguimos la **plata pública** de Coronel Rosales." con "plata pública" en
  `--stamp`, línea de apoyo (fuente + copia archivada + sha256 + promesa de
  neutralidad), dos CTA (primario relleno `--ink` "Ver la coparticipación" + outline
  "Cómo verificamos"), y el chip de frescura discontinuo. Columna derecha: UNA tarjeta
  flotante (`rounded-lg border border-rule shadow-card`, misma familia que las demás
  "tarjetas destacadas" del sitio) que contiene, apiladas: label + mes, la cifra
  mono a escala DE TARJETA (`clamp(38px,9vw,68px)`, no el mono gigante de home v1) con
  la unidad "millones" más chica al lado, la declaración "en pesos constantes de
  {mes} (IPC INDEC)", un sparkline de la serie real, el chip de variación real
  (▲/▼ + "real vs. {mes anterior}", oliva/sello), un filete divisor, la conclusión
  Fraunces data-driven (`lib/insight.ts`), y la línea de procedencia dual-link +
  sha256. En mobile la grilla colapsa a una sola columna (la tarjeta debajo del
  bloque editorial) -- el refinamiento específico de mobile (proporciones, orden)
  queda para una slice siguiente. Las "chips de acceso rápido" (patrón documentado
  más abajo) YA NO viven en este hero -- las dos CTA cubren ese rol; el patrón
  queda disponible para reutilizar en otra página.
- **Landing del home debajo del hero (v2.2, fidelidad a Mockup A -- ver decisión
  F2 abajo): DASHBOARD denso, no una tabla de contenidos de filas acordeón.**
  Tres secciones, cada una con kicker mono + pregunta Fraunces (`<h2>`) + link
  mono "Ver todo →" a la ruta completa, componiendo componentes YA EXISTENTES
  (nunca lógica nueva): (1) "¿Cuánto llegó este mes?" -- tarjeta con la
  conclusión data-driven arriba y el propio `InteractiveCoparticipacionChart`
  de `/coparticipacion` (mismo componente, ya acotado a 420px desktop/`~50vh`
  mobile) + procedencia dual-link/sha256 abajo; (2) "¿Qué dicen las multas del
  Tribunal de Cuentas?" -- una nota de neutralidad estructural + una grilla de
  `FalloCard` REALES (nunca detrás de un índice por año): todos los registros
  del ejercicio más reciente + un registro representativo por cada ejercicio
  más viejo (`selectFallosPreview`, `lib/sources.ts` -- nunca deja un ejercicio
  entero afuera, garantía de honestidad); (3) "¿Qué tan transparente es el
  municipio?" -- `TransparenciaGauge` (extraído de `/transparencia`, mismo
  anillo reusado a `size={128}`) + categoría + badge de tendencia (+11 vs.
  informe anterior) + atribución ASAP (asociación civil, no un ministerio;
  transparencia fiscal, no integral) + un hint compacto "Qué falta: N de M
  dimensiones..." (el detalle completo por dimensión sigue solo en
  `/transparencia`) + procedencia dual-link/sha256. "¿De dónde salen los
  datos?" sigue como la fila simple original (pregunta + link, toda la fila
  tappable) -- no tiene un componente de dashboard propio que previsualizar.
  `ColorLegend` se mantiene después de las tres secciones, antes del footer.
- **Radios (v2, relajado — antes "border-radius: 0 en todo").** Escala modesta y consistente:
  `--radius-sm` 8px (controles, chips), `--radius-md` 12px (tarjetas), `--radius-lg` 16px
  (drawer/sheet, tarjetas destacadas), `--radius-full` (pills, badges). Racional: el dueño pidió
  una dirección "más marketinera, moderna, intuitiva" y autorizó explícitamente relajar la
  doctrina recta del recibo; los radios se mantienen MODESTOS a propósito (nunca `2xl`/`3xl`
  genéricos de SaaS) para no perder la identidad de "documento", solo suavizarla. Body copy,
  tablas de datos y la fila de procedencia (fuente/archivo/sha256) **siguen sin radio** — son las
  piezas que más necesitan leerse como documento, no como tarjeta de producto. Aprobado por el
  dueño 2026-07-07.
- **Navegación (v2):** header sticky con sombra sutil solo al hacer scroll (`StickyHeaderShell`,
  ver Motion) en vez del filete fijo de 2–3px `--ink` original. Links subrayados con
  `text-decoration-color: var(--stamp)`, offset 3px, grosor 2px (sin cambios). En mobile, el nav
  inline del header se oculta (`hidden sm:flex`) y se reemplaza por una bottom tab-bar sticky
  (`MobileBottomNav`, injerto de la Dirección C) — ver Componentes canónicos.

## Componentes canónicos

- **Botones:** rectos, borde 2px. Primario: fondo `--ink` texto `--surface`. Secundario: transparente borde `--ink`. Énfasis fuente-oficial: fondo `--stamp`.
- **Chip de frescura:** borde discontinuo (`dashed`) `--muted`, mono 12px, fondo `--paper` — "datos hasta abril 2026 — la Provincia publica con 2 a 3 meses de rezago".
- **Tarjeta de fallo:** superficie con borde `--rule` + **borde izquierdo 6px `--ocre`**; año/fecha en mono uppercase; nombre en Fraunces; multa en mono 26px; cita en Newsreader itálica; línea de procedencia en mono 11.5px con doble link (oficial + archivo) + sha256 corto. **Template idéntico para toda gestión** — la neutralidad es estructural. Fallo escaneado: badge ocre "documento escaneado — texto no extraído".
- **Gráficos:** SVG server-rendered, cero JS. Serie constante en `--olive` 3px; serie nominal punteada `--muted` 1.5px; grilla `--rule` discontinua; labels mono 11px; último punto marcado con valor. Siempre acompañado de tabla accesible (caption mono uppercase, th filete 2px `--ink`, números `tabular-nums` alineados a derecha).
  - **Variante héroe** (`/coparticipacion`): una sola serie (Coronel Rosales, real), sin la lista de referencias sólido/punteado (sería redundante con la etiqueta al final de línea), altura `~50vh` en mobile (`viewBox` propio, más "alto" que el 2:1 por defecto), grilla con ≥1 marca intermedia por año presente en la serie, y una leyenda corta de unidad arriba del gráfico ("Montos en pesos, ajustados por inflación"). Desde el breakpoint `sm` en adelante usa un `viewBox` propio distinto, en paisaje (`880×460` en vez de `380×460`), altura fija `420px`: el `viewBox` portrait de mobile, si se reutilizara tal cual en una pantalla ancha, deja franjas vacías grandes a los costados (letterboxing); el paisaje reparte la misma serie en más ancho sin distorsionarla ni sacrificar la altura mobile. La etiqueta de valor al final de línea se separa levemente del punto (arriba y a la derecha) en ambas variantes para no superponerse con el trazo. La serie nominal y la comparación con vecinos quedan detrás de `<details>` cerrados por defecto, nunca eliminadas.
- **Alerts:** superficie + borde izquierdo 5px (oliva=dato nuevo, ocre=aviso documental, sello=fuente caída).
- **Cifras es-AR:** miles con punto, decimales con coma; "$ 1.548 millones"; toda cifra ajustada declara al lado o al pie: "en pesos constantes de mayo 2026 (IPC INDEC)".
  - **Cifra redondeada humana** (titulares y tablas): `formatArsHuman` redondea a ~3 cifras significativas y siempre dice "millones" (nunca "mil millones") — "$ 1.750 millones", no "$ 1,75 mil millones". La cifra exacta (`formatArsPlain`) queda disponible al pasar el mouse/mantener tocado (atributo `title`), nunca se pierde.
- **Divulgación cero-JS (`<details>`/`<summary>`):** patrón canónico para deprioritizar detalle sin eliminarlo. Cerrado por defecto. Usos: "Ver todos los números" (tablas + metodología + comparación con vecinos en `/coparticipacion`), cada grupo de fuentes en `/fuentes` ("Coparticipación (2)", etc., con un `<h3>` `sr-only` dentro del `<summary>` para que la navegación por encabezados de lector de pantalla siga funcionando sin duplicar el rótulo visible), y el toggle "ver también sin ajustar" del gráfico héroe. El contenido colapsado NUNCA es información nueva quitada — siempre es la misma información, un tap más lejos.
- **Conclusión de página (dato-dirigida):** una oración en lenguaje llano, en Fraunces, ANTES del gráfico/tabla, que resume el dato — nunca un texto fijo. `/coparticipacion` la deriva de `lib/insight.ts` (`computeCoparticipacionTrend`): compara el último valor real contra el mismo mes del año anterior (o, si no existe, contra el promedio del año calendario completo más antiguo disponible) con una banda neutral de ±5%, y devuelve "sube"/"estancado"/"cae" — nunca una afirmación que el dato no sostenga.
- **Chips de acceso rápido:** fila de 2-3 links cortos, borde 2px `--ink`, altura mínima 44px, debajo del número héroe del home — garantiza que al menos una acción quede visible sin scroll en un mobile bajo, sin necesidad de comprimir el resto del afiche.
- **Fila-pregunta tappable:** en el home, la fila entera de cada sección (pregunta Fraunces + chevron "›") es el `<Link>`, no solo un texto secundario "ver →" — altura mínima 44px.
- **Números en rojo (nunca solo color):** una celda que cae respecto del período anterior lleva, además del color `--stamp`, un marcador "▼ " (WCAG 1.4.1, uso de color) y la tabla muestra una leyenda fija: "En rojo: cayó respecto del mes anterior." — nunca evaluativo de una gestión.
- **Nav activo:** el ítem de navegación de la sección actual lleva `aria-current="page"` + `--stamp` + negrita. Se resuelve por sección vía un `layout.tsx` propio de cada ruta de primer nivel (no `usePathname()`, que forzaría un Client Component solo para este resaltado cosmético) que pasa `activeHref` a `SiteHeader`.
- **Cifra de cumplimiento (`/transparencia`):** mismo tratamiento tipográfico que el número-héroe del home (mono gigante `clamp(52px,11vw,128px)`) pero como fracción explícita ("81 / 100"), seguida de la categoría propia del índice ("Alto cumplimiento") en Fraunces, sin colorear -- la categoría es la clasificación textual que publica la fuente, no una variación aritmética, así que no lleva `--olive`/`--stamp` (regla de neutralidad cromática).
- **Barra de progreso de cumplimiento (cero JS):** para trazar un puntaje en el tiempo (ej. la tendencia 70→81 de `/transparencia`) sin un componente de gráfico completo: `<div>`s planos, ancho proporcional (`style={{width: "N%"}}`) sobre un track `--rule`, relleno `--olive` porque es una variación aritmética real de la MISMA serie en el tiempo (mismo precedente que el chip de variación real de coparticipación) -- nunca para comparar entre gestiones o personas. Un valor por fila, con el label y el número al lado en mono; siempre acompañado de la oración equivalente en prosa (nunca solo el gráfico).
- **Ítem pendiente documental (dimensión "qué falta"):** reutiliza el token `--ocre` "resalta, no juzga" (mismo usado en la tarjeta de fallo y el badge "documento escaneado") con borde izquierdo 5px, para listar sub-puntajes por debajo del máximo de una fuente externa (ej. dimensiones fiscales de ASAP) -- nunca `--stamp`/rojo-alarma, porque no es una falla imputable a una persona o gestión, es un ítem objetivo de una metodología publicada.

### Componentes del app shell (v2, slice 1)

- **`SiteHeader` + `StickyHeaderShell`:** el header sigue siendo un Server Component (el nav
  activo se sigue resolviendo por `layout.tsx` de sección, ver "Nav activo" arriba — sin cambios
  en ese mecanismo). `StickyHeaderShell` es una isla de cliente chica y separada, solo responsable
  de la posición sticky y de agregar `--shadow-header` una vez que la página hizo scroll (antes:
  filete fijo de 2–3px siempre visible). El nav inline se oculta en mobile (`hidden sm:flex`); en
  su lugar, mobile usa `MobileBottomNav`. **v2.1 (fidelidad a Mockup A, F1):** el wordmark ahora
  lleva un badge cuadrado "$" (fondo `--ink`, mono, `radius-sm`) antes del texto, y un subtítulo
  mono "Coronel Rosales · Punta Alta" debajo del wordmark. Todo el bloque es un único `<Link>`
  con `aria-label` explícito (el badge es `aria-hidden`), en vez de depender del texto visible
  para el nombre accesible.
- **`MobileBottomNav`:** bottom tab bar sticky (injerto de la Dirección C), 4 tabs (Inicio · Plata
  · Multas · Transparencia), objetivos de toque ≥44px, `nav` con landmark + `aria-current="page"`
  en el tab activo (nunca color solo). A diferencia de `SiteHeader`, es una isla de cliente
  genuina (`usePathname()`) — se acepta explícitamente para este slice porque es chrome siempre
  montado en cada ruta, exactamente el tipo de isla chica que este rediseño autoriza. Respeta
  `env(safe-area-inset-bottom)` y el body agrega padding inferior (`pb-20 sm:pb-0`) para que el
  contenido nunca quede tapado.
- **`ThemeToggle`:** botón `aria-pressed`, persiste en `localStorage` (`ddvlp-theme`), nunca lee
  `prefers-color-scheme`. Ver sección Color.
- **`Drawer` (Sheet):** overlay reusable — drawer desde la derecha en desktop, bottom-sheet en
  mobile, ambos vía breakpoints CSS (sin ramificación por JS). Focus trap real (Tab/Shift+Tab
  ciclan manualmente dentro del panel), ESC cierra, click en backdrop cierra, scroll del body
  bloqueado mientras está abierto, foco vuelve al disparador al cerrar, drag-down-to-dismiss en
  mobile. Cerrado = `aria-hidden`+`inert`, genuinely fuera del árbol de accesibilidad aunque siga
  montado (para permitir la transición de salida). Este slice entrega el primitivo; las tablas
  completas + metodología que va a alojar llegan en los slices 2-3.
- **`ColorLegend` ("Cómo leer los colores"):** explicador reusable (injerto de la Dirección C) que
  declara la regla de neutralidad cromática en lenguaje llano, con las marcas ▲/▼ visibles, no
  solo color. Pensado para vivir junto a cualquier gráfico/tabla/puntaje (se cablea en contenido
  de página en slices 2-3; este slice entrega el componente).
- **`CountUp` (+ `useCountUp`):** conteo ascendente para cifras héroe (monto del home,
  puntaje 81/100 de `/transparencia`). SSR y primer render de cliente muestran el valor FINAL
  directamente (nunca "0" para un visitante sin JS); la animación 0→valor es una mejora
  progresiva post-montaje. `prefers-reduced-motion` la salta por completo. Ver Motion.
- **`ScrollReveal`:** revelado al hacer scroll, CSS-first con mejora JS. Por defecto (SSR, sin JS,
  o si `IntersectionObserver` no existe) el contenido está SIEMPRE visible. Con JS + motion
  permitido, se "arma" (fade+offset) recién en el próximo frame de animación y se revela al
  entrar en viewport, con un timeout de seguridad que fuerza el revelado igual si el observer
  nunca dispara. Ver Motion.

## Motion

**v2 (relajado — antes "mínimo-funcional, nada de animación de entrada, scroll-driven ni
parallax").** Racional del cambio: el dueño pidió una dirección más moderna/intuitiva y autorizó
explícitamente drawers, count-up y revelado al scroll. La relajación es deliberada y acotada —
sigue sin haber una librería de animación de terceros, scroll-jacking, ni parallax decorativo.
Aprobado por el dueño 2026-07-07.

- **Transiciones base:** CSS puro, 150–300ms ease-out, en hover/focus de links/botones, cambio de
  tema (`color`/`background-color`), header sticky (sombra), y drawer/sheet (`transform`,
  `opacity`).
- **Primitivas de motion con lógica (JS, con red de seguridad):**
  - `useCountUp`/`CountUp` — ver Componentes del app shell arriba.
  - `ScrollReveal` — ver Componentes del app shell arriba. El bug que motivó su diseño: un
    revelado basado solo en `IntersectionObserver` puede fallar en disparar bajo ciertas
    posiciones de scroll y dejar contenido real permanentemente oculto — de ahí el timeout de
    seguridad obligatorio en cualquier primitiva de motion nueva que oculte contenido
    condicionalmente.
- **`prefers-reduced-motion: reduce`:** honrado en dos niveles — (1) una regla CSS global colapsa
  toda `transition`/`animation` a ~instantánea, (2) cada primitiva de motion en JS (`useCountUp`,
  `ScrollReveal`) además chequea el media query y **salta la animación por completo** (no solo la
  acorta) cuando aplica, porque en esos casos el estado "sin animar" es semánticamente el correcto
  (mostrar el valor final ya, no ocultar contenido y esperar).
- **Sigue prohibido:** librerías de gráficos/animación pesadas de terceros, cualquier fetch de
  datos en runtime disparado por scroll, parallax decorativo, scroll-jacking.

## Accesibilidad

- AA mínimo en todo par texto/fondo (muted solo ≥16px, en ambos temas). Focus visible: outline 2px
  `--stamp`, nunca suprimido. Lighthouse a11y ≥ 90 (hoy: 100 — no retroceder).
- **Dark mode y contraste (v2):** la paleta dark se validó para mantener el mismo piso AA que
  light en los pares texto/fondo de la tabla de Color — no es una inversión automática de
  colores, son valores elegidos a mano por token.
- **Overlays (v2):** `Drawer` es `role="dialog"` + `aria-modal` + `aria-labelledby`, con foco
  atrapado real y cerrado = fuera del árbol de accesibilidad (`aria-hidden`+`inert`), no solo
  visualmente oculto.
- **Navegación mobile (v2):** `MobileBottomNav` es un landmark `nav` propio con
  `aria-current="page"` en el tab activo; en cualquier viewport dado solo un nav (header o
  bottom-bar) queda expuesto al árbol de accesibilidad, nunca los dos a la vez.
- **Motion:** `prefers-reduced-motion` respetado tanto en CSS global como en cada primitiva JS —
  ver Motion arriba.

## Registro de decisiones

| Fecha | Decisión | Racional |
|---|---|---|
| 2026-07-07 | Sistema "El Recibo del Municipio" creado | /design-consultation: research visual (ProPublica, Chequeado, OWID, Presupuesto Abierto como anti-referente) + voz de diseño independiente ciega. Memorable elegido por el dueño: "acá están los números que nadie muestra". |
| 2026-07-07 | Sin dark mode (doctrina) | Metáfora material del recibo + audiencia diurna en Android de gama baja + un solo sistema cromático bien hecho. |
| 2026-07-07 | Descartados "sellos rotados" clicables | Propuesta de la voz independiente; rompe affordance para audiencia no técnica. Disponible como exploración futura. |
| 2026-07-07 | Comparación con vecinos NO pasa a "$ por habitante" (queda en pesos absolutos + advertencia) | El fix honesto sería per-capita con Censo 2022 INDEC como fuente citada, pero este build no tiene una fuente de población archivada/sha256 en `archive-manifest.json`, y `getPortalData()` rechaza cualquier `sourceRefs` sin registro en el manifest. Inventar la población sin fuente archivada violaría la misma doctrina de "nunca fabricar" que rige cada otra cifra del sitio. Fallback: `/coparticipacion` muestra por defecto solo Coronel Rosales; la comparación absoluta se movió detrás de "Ver todos los números" con la advertencia "Cifras absolutas, no ajustadas por población — Bahía Blanca tiene varias veces más habitantes que Coronel Rosales." Revisar si en el futuro se consigue y archiva una fuente INDEC verificable. |
| 2026-07-07 | Nav activo vía `layout.tsx` por sección, no `usePathname()` | `usePathname()` exige un Client Component solo para un resaltado cosmético (contra la doctrina cero-JS) y además lanza una excepción fuera de un router de Next montado — exactamente cómo este repo renderiza `SiteHeader`/páginas en los tests. Cada sección de primer nivel tiene su propio `layout.tsx` que le pasa `activeHref` a `SiteHeader`; el home ("/") no tiene layout anidado y se renderiza a sí mismo con `activeHref={null}`. Verificado contra un `next build` real (`aria-current="page"` presente en el HTML generado), no solo en jsdom. |
| 2026-07-07 | Gráfico héroe: `viewBox` paisaje propio (`880×460`) desde `sm`, en vez de escalar el `viewBox` portrait mobile | El portrait `380×460` (pensado para `~50vh` en un teléfono) dentro de un contenedor ancho de escritorio hacía *letterboxing* — chico y centrado, con márgenes vacíos grandes a los costados. Como el sitio es cero-JS/server-rendered, no hay forma de medir el viewport en runtime; se renderizan ambas variantes (mobile y desktop) en el HTML y se alternan con `sm:hidden` / `hidden sm:block` (mismo patrón cero-JS ya usado en la comparación de vecinos), no con detección por JS. |
| 2026-07-07 | Nueva sección `/transparencia` (Índice de Transparencia Fiscal Municipal, ASAP) | Corrección de atribución: el índice lo publica ASAP (asociación civil/profesional), NUNCA "Ministerio de Capital Humano" (esa atribución original era incorrecta -- Capital Humano no publica ningún índice municipal). La sección es explícita en tres cosas a la vez, siempre visibles, nunca solo en la letra chica: (1) quién lo publica y que NO es un ministerio, (2) que mide transparencia FISCAL, no integral (compras/salarios/DDJJ/actas/datos abiertos quedan fuera), (3) que un 100 acá no equivale a transparencia integral. Trend 70(nov 2025)→81(may 2026) coloreado `--olive` por ser variación aritmética real de la misma serie (mismo precedente que el badge de coparticipación), nunca un juicio sobre gestión/persona. Ver nuevos patrones "Cifra de cumplimiento", "Barra de progreso de cumplimiento" e "Ítem pendiente documental" en Componentes canónicos. |
| 2026-07-07 | **v2 — rediseño "Dashboard cívico premium"** aprobado por el dueño | El dueño pidió una dirección "más marketinera, moderna, intuitiva" y autorizó explícitamente JS/drawers/tablas interactivas. Se evaluaron 3 direcciones (mockups en `mock-dashboard.html`=A, `mock-appvibrant.html`=C, `mock-editorial.html`=B, descartada por leer como startup y costar credibilidad en un portal de transparencia). Elegida: base A (contención tipo Linear/Stripe sobre el ADN papel+tinta+sello) injertando las piezas mobile de C (bottom tab-bar, bottom-sheet, "Cómo leer los colores"). Las reglas INVIOLABLES (neutralidad + marca ▲/▼, procedencia sha256, es-AR, a11y ≥90, datos build-time) se preservan explícitamente y quedan documentadas en su propia sección al tope de este archivo. |
| 2026-07-07 | Slice 1 del rediseño: fundación + app shell + primitivas interactivas compartidas | Entregado: tokens de tema (elevación, radios modestos, dark mode opt-in), `useCountUp`/`CountUp`, `ScrollReveal`, `StickyHeaderShell` + `ThemeToggle` cableados en `SiteHeader`, `MobileBottomNav` cableado en `app/layout.tsx`, `Drawer` (primitivo reusable, aún no cableado a contenido de página), `ColorLegend` (componente reusable, aún no cableado a contenido de página). El contenido de página (gráficos, tarjetas de fallo, tablas) queda **sin cambios** este slice a propósito -- se rediseña en los slices 2-3, que también cablean `Drawer`/`ColorLegend` a las páginas reales. Todos los tests de invariantes preexistentes (neutralidad, procedencia dual, recencia de fallos, indexado de gráfico por período, título del rebrand, honestidad de `/transparencia`) siguen en verde sin modificación. |
| 2026-07-07 | Radios de borde relajados de 0 a una escala modesta (8/12/16/24/28px) | Ver sección Espaciado y layout. Body copy, tablas de datos y la fila de procedencia siguen sin radio -- son las piezas que más necesitan leerse como documento oficial, no como tarjeta de producto. |
| 2026-07-07 | Dark mode opt-in agregado (antes doctrina "NO") | Ver sección Color. Opcional y persistido, nunca sigue `prefers-color-scheme` del SO -- light sigue siendo el default de todo visitante nuevo, así que esta relajación no cambia la experiencia por defecto de nadie. |
| 2026-07-07 | Islas de cliente chicas autorizadas (antes doctrina cero-JS estricta) | Ver Regla INVIOLABLE #4 (reformulada, no eliminada): los DATOS siguen siendo 100% build-time -- lo que cambia es que ahora se permite JS puntual para interacción (drawer, tema, tab activo mobile, conteo, revelado al scroll), nunca para traer datos en runtime ni para reemplazar un gráfico SVG server-rendered por una librería de terceros. |
| 2026-07-08 | **F1 — fix de fidelidad visual del home hero (desktop) + identidad del header**, contra Mockup A como spec de composición estricta | Auditoría de fidelidad detectó el home hero en producción todavía era el afiche v1 (columna única, número mono gigante, filas acordeón) pese a que Mockup A (base del rediseño v2, aprobada 2026-07-07) especifica un hero de DOS COLUMNAS con tarjeta flotante. Se reconstruyó `app/page.tsx`: columna editorial (kicker + titular Fraunces con "plata pública" en `--stamp` + línea de apoyo + dos CTA + chip de frescura) a la izquierda, una tarjeta destacada (`rounded-lg border shadow-card`, misma familia que las demás tarjetas del sitio) con la cifra a escala de tarjeta a la derecha. `SiteHeader` suma el badge cuadrado "$" y el subtítulo "Coronel Rosales · Punta Alta". `ColorLegend` se sacó del hero (no está en Mockup A) y se reubicó más abajo en la página, antes del footer -- sigue presente, solo cambia de lugar. Se agregó `splitArsUnit` (`lib/format.ts`) para separar el monto de la unidad "millones" sin volver a derivar ni redondear el número (la cifra exacta se preserva). Desviaciones deliberadas de la copia literal del mockup, explicadas en el propio commit/PR: (1) la línea de procedencia de la tarjeta conserva el texto "Fuente original" / "Copia archivada" (en vez del nombre de la fuente) porque así lo exige el test de invariante de procedencia dual-link ya existente; (2) el chip de frescura usa "abril 2026" (dato real, formateado sin "de") en vez de repetir la nota de rezago completa de `lib/data`, para calzar en una sola línea como en el mockup, sin inventar un dato nuevo. Todos los tests de invariantes preexistentes (neutralidad, procedencia dual, recencia de fallos, indexado de gráfico por período, título del rebrand, honestidad de `/transparencia`) siguen en verde; los tests que codificaban el layout VIEJO del hero (subhead de una sola oración, chips de "accesos rápidos", jerga "real vs." prohibida) se actualizaron para reflejar la composición nueva, deliberada y aprobada por el dueño -- no se debilitó ninguna regla de neutralidad/procedencia/honestidad. Mobile hero (proporciones, orden) queda para una slice siguiente (F3); F2 cablea los componentes de dashboard reales (gráfico interactivo, tarjetas de fallo, gauge) en las filas de sección que hoy siguen siendo el índice simple heredado de v1. |
| 2026-07-08 | **F2 — fix de fidelidad visual de la landing del home (debajo del hero)**, contra Mockup A como spec de composición estricta | Auditoría de fidelidad detectó que, pese al hero rehecho en F1, la landing debajo seguía siendo filas acordeón simples ("¿Cuánto llegó este mes?" con chevron `›`) en vez del dashboard denso de Mockup A. Se reemplazaron tres de las cuatro filas por secciones de dashboard reales, componiendo componentes YA EXISTENTES (nunca lógica de negocio nueva): `InteractiveCoparticipacionChart` (mismo componente de `/coparticipacion`, sin cambios), `FalloCard` (mismo componente de `/fallos`, sin cambios) y un nuevo `TransparenciaGauge` (`components/TransparenciaGauge.tsx`) -- extracción PURA del anillo SVG + `<CountUp>` que antes vivía inline en `/transparencia/page.tsx`, ahora reusado en ambas páginas al mismo `computeGaugeGeometry` con un `size` configurable, sin cambiar el markup/comportamiento que `/transparencia` ya tenía validado. También se agregó `selectFallosPreview` (`lib/sources.ts`, con tests TDD dedicados) -- selección determinística y con garantía de honestidad (nunca deja un ejercicio completo afuera) para acotar la grilla de fallos del home a un tamaño de preview razonable sin ocultar ninguna administración. La fila "¿De dónde salen los datos?" conserva el patrón viejo (fila entera tappable) -- no tiene componente de dashboard propio. El test `rebrand.test.tsx` que verificaba "la fila entera de la pregunta es el link" para "¿Cuánto llegó este mes?" se reapuntó a la fila de fuentes (única que conserva ese patrón), porque las tres secciones nuevas necesariamente separan la pregunta de un link "Ver todo →" propio: no es válido anidar contenido interactivo (el toggle Real/Nominal del gráfico, el SVG con `tabindex`+manejadores de teclado) dentro de un `<a>` -- rompe semántica HTML y accesibilidad de teclado/lector de pantalla. Se agregaron tests nuevos (nunca se debilitó ninguno existente) verificando: el gráfico interactivo real está presente, la grilla de fallos muestra el campo-set idéntico por tarjeta (invariante de neutralidad) con procedencia dual-link+sha256 en cada una y nunca deja un ejercicio afuera, y la tarjeta de transparencia repite la atribución ASAP correcta (asociación civil, no un ministerio; fiscal, no integral) + procedencia. Bug real encontrado y corregido durante el auto-QA visual: un espacio faltante ("6dimensiones" en vez de "6 dimensiones") causado por el recorte de espacios en blanco de JSX cuando un texto envuelve a múltiples líneas justo después de una expresión `{...}` sin un `{" "}` explícito -- mismo patrón ya usado correctamente en otras partes del hero, faltaba en esta línea nueva. |
| 2026-07-08 | **F3 — fidelidad del home hero MOBILE + pase de QA de todo el sitio**, contra Mockup C como spec estricta para mobile | Cierre del último gap de fidelidad: F1 había dejado explícitamente pendiente "el refinamiento específico de mobile" del hero. Por debajo de `lg`, la tarjeta ahora lidera (pill "independiente", cifra a escala reducida, mismo chip de variación/procedencia) en vez de la columna editorial completa, que colapsa a una única línea de apoyo + el chip de frescura (única pieza que sigue visible en todo breakpoint). Debajo, una lista nueva de filas de acceso rápido (ícono + pregunta + valor + chevron, agrupadas en una tarjeta redondeada) resume coparticipación/fallos/transparencia. **Decisión técnica clave**: todo lo nuevo se logra con CSS puro (`order`, `hidden lg:block`/`lg:hidden`, overrides `lg:` de tamaño/padding) sobre la MISMA tarjeta y el MISMO bloque editorial de F1 -- nunca una segunda copia del DOM para mobile vs. desktop. Motivo: el harness de tests corre en jsdom sin CSS real, así que cualquier texto duplicado en dos árboles (uno "mobile", uno "desktop") rompe los `getByText`/`getByRole` de un solo match que F1/F2 ya dejaron en verde (ej. la cifra exacta de la tarjeta, la región "Cifra destacada del mes"). Cada pieza nueva (pill "independiente", lede, filas) es contenido genuinamente nuevo o una reformulación (ej. "$ 1.750 M" en vez de "1.750"/"millones" sueltos) para no colisionar con esas queries existentes. Se decidió NO reintroducir el patrón "chips de acceso rápido" (documentado, sin usar desde F1) junto con las filas nuevas -- ambos apuntarían a los mismos 3 destinos en la misma pantalla mobile, redundante; las filas solas cubren el rol con más densidad de información (valor + variación visibles de un vistazo). Desktop (`lg` y superior) queda byte-idéntico a F1/F2, verificado visualmente. **Bugs reales encontrados y corregidos durante el pase de QA** (no solo en el hero nuevo): (1) la fila de coparticipación mostraba "$ $ 1.750 M" -- `heroAmount` (de `splitArsUnit`) ya incluye su propio "$ ", así que anteponer otro era un bug real, no solo un typo de copy; el test que lo cubría originalmente replicaba el mismo error en vez de detectarlo y también se corrigió. (2) `InteractiveCoparticipacionChart` (usado tanto en `/coparticipacion` como en la vista previa del home) tenía overlap real de gráfico en mobile (viewBox angosto de 380): el label de fin de línea ("$ 1.750 millones") no tenía fondo, así que en la serie real de producción el pico de un mes anterior atraviesa el texto -- se agregó un pill de fondo `--ink`/texto `--surface` detrás del label (mismo criterio del `.end-lab` del mockup C aprobado, con el ancho estimado por conteo de caracteres, mismo patrón que ya usa este archivo para el gutter del eje Y). (3) Se encontró un mismatch de hidratación real (no cosmético) en cada carga: el script anti-flash de tema (`app/layout.tsx`) fija `data-theme` en `<html>` antes de que React hidrate, lo cual SIEMPRE genera una advertencia de hidratación en ese atributo específico -- se agregó `suppressHydrationWarning` en `<html>` (fix estándar documentado por Next.js para este patrón exacto de anti-flash de tema), eliminando la advertencia real de consola sin tocar el comportamiento. **Verificación**: `npm run test` (241/241, 7 tests nuevos para el hero/filas mobile), `tsc --noEmit` limpio, `lint` limpio, `next build` (12 rutas sin cambios), Lighthouse a11y = 100 en `/`, `/coparticipacion`, `/fallos`, `/transparencia`, `/fuentes` (build real + `next start`). Auto-QA visual: capturas a 390px y 1280px, light y dark, en las 7 rutas -- sin overflow, sin regresión de contraste, bottom-nav sin superposición (confirmado que el "drawer abierto" que aparecía en una captura full-page de Playwright era un artefacto conocido de `position:fixed` + captura de página completa, no un bug real -- verificado vía `aria-hidden`/`inert`/clase `translate-y-full` en el DOM real). |
