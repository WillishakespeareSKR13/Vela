# Alineación de Vela (dashboard) contra `docs/07-recetas-de-producto.md`

> C3, camino **B** (el panel ya está en Nebula, como scaffolding). Nebula leída en
> `~/Documents/Github/Nebula` a 1.1.14 (publicada en npm el 2026-09-13 20:00Z). El dashboard
> pinea `1.0.0`. Fecha: 2026-09-13.

## Fase 1 · Auditoría

Pantalla auditada: `dashboard/app/Dashboard.tsx` (rejilla de equipos + vista de foco + control),
`app/layout.tsx`, `app/theme.ts`, `app/base.css`, `lib/useMonitor.ts`.

| § docs/07 | Receta | Vela hoy (fichero:línea) | Delta | Sev. | Tramo |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Props de estilo antes que CSS | `Dashboard.tsx:137,138,139,179,199,224,227,341` `style={{…}}`; `:357-385` tres objetos `CSSProperties` (overlayTop, overlayBottom, dot) | Doce `style` en línea que `p`, `r`, `bg`, `position`, `cursor`, `fz`, `ff` cubren | 🔴 | F4 |
| 1.2 | Cero hex, cero px, cero transición | 7 hex (`#000`×3, `#22c55e`×2, `#6b7280`, `#ef4444`), radios 6/8/10/12 y `fontSize` 11/12 a mano | Colores por rol (`surface.sunken`, `success.500`, `text.muted`, `error.500`), `r="sm/md"`, `fz="caption"` | 🔴 | F4 |
| 1.3 | Servidor por defecto | `Dashboard.tsx:1` todo el panel es `"use client"`, incluida la cabecera y los textos | Cáscara de cliente sólo para lo que vive de WebRTC (rejilla, foco, control); cabecera, lámina vacía y armazón en servidor | 🟠 | F3/F4 |
| 1.4 | `component={Link}` no cruza RSC | no hay enlaces | no aplica (una sola ruta) | — | — |
| 1.5 | CSS global en `@layer` bajo Nebula | `base.css` en `@layer legacy`, importado **antes** de `styles.css` (`layout.tsx:6-7`) | Igual. Nota: el snippet de docs/07 §2 importa `base.css` después, lo que deja `legacy` **encima** de Nebula; N1 y la regla 1.5 dicen debajo → propuesta a docs/07 | 🟡 | F6 |
| 1.6 | Tema = semilla | `theme.ts` semilla propia `"vela" as SeedName`, indigo/cyan | El catálogo trae un tema **`vela`** (lime/rose) con subpath propio; la semilla actual repite el nombre con otro color y no hay marca que la justifique → decisión del propietario | 🟠 | F2 |
| 1.7 | Iconos como registro tipado | ningún icono; puntos de estado con `span` + hex | `CreateIcons` en `theme/icons.tsx`; `Icon name="monitor"`, `"keyboard"`, `"grid"`, `"activity"` | 🔴 | F2/F4 |
| 1.8 | Un `h1` por pantalla, tarjetas `order={3}` | `Dashboard.tsx:46` `<Title order={3}>Vela</Title>` en la barra; las tarjetas no tienen título semántico (`span` con `fontWeight`) | `AppShell.Header title order={1}`; nombre del equipo en `Title fz="h5" order={3}` | 🔴 | F4 |
| 1.9 | Cifras en `ff="mono"` | `fmtStats` en `span` con `fontFamily: var(--font-mono)` a mano (`:380`) | `Text ff="mono" fz="caption"` / `Stat` | 🟠 | F4 |
| 1.10 | Copia en español seco | «Esperando a que se conecten equipos…», «Control activo: el mouse y el teclado se envían a X.» | Sin puntos suspensivos; «ratón» o «mouse» — decidir; nada nombra otra pantalla ✔ | 🟡 | F5 |
| 2 | La raíz | `layout.tsx`: fuentes → `base.css` → `styles.css`, `ThemeScript` en `<head>` con `themesCSS`, `NebulaProvider applyTheme="root"` | Igual salvo `data-scroll-behavior="smooth"` y la clase de `body` con `surface.base`/`text.primary`/`100dvh` (hoy sin clase: el lienzo lo pinta el provider) | 🟡 | F2 |
| 3 | Tema del producto | semilla propia con `wash 0.009, lift −12, inkFloor 2` (valores de N1, no los de docs/07 §3: `lift {base −14, sunken −8, raised −6, overlay −8}`, `glass sheer`) | Adoptar `@stellaria/nebula-themes/vela/web` **o** semilla propia con los valores de sistema de §3. Sin `check:contrast` corrido; AA sin decidir | 🟠 | F2 |
| 4 | Armazón público (landing) | no hay landing | no aplica: Vela es sólo panel | — | — |
| 5 | Landing: secciones, hero, tarjetas | — | no aplica | — | — |
| 6.1 | `AppShell` en carril | `Dashboard.tsx:81` `Main header padded centered={false}` | `Main` es el armazón **público**; un panel va en `AppShell sidebar` (carril, `100dvh`, scroll en `main`) | 🔴 | F3 |
| 6.2 | La barra | no hay barra | Sidebar con marca + grupo de enlaces del diccionario + pie (tema, estado de conexión) | 🔴 | F3 |
| 6.3 | Tres estados del carril | — | Entradas previstas: «Equipos» (+ «Actividad»/«Ajustes» si se quieren): 1–3, cabe en la tira | 🟡 | F3 |
| 7.1 | `Screen`: cabecera pegada `h5`/`body3` | Cabecera a mano en `Group` (`:39-78`): título, badge de conexión, contador, botones de calidad | `AppShell.Section sticky` + `AppShell.Header title subtitle actions titleProps={{fz:"h5"}}`; contenido en `Flex p={{base:"sm",tablet:"lg"}}` | 🔴 | F4 |
| 7.2–7.3 | Interruptor de scroll / cabecera que se encoge | — | no aplica: la rejilla no tiene ficha larga | — | — |
| 7.4 | `data-floating` | — | lo pone `AppShell.Header sticky` solo (ADR-188) | — | — |
| 8.1 | Modal, un solo patrón | la vista de foco es estado (`focus`) que sustituye la rejilla en la misma ruta | Decisión del propietario: **ruta dedicada** `/equipos/[id]` vs estado en la pantalla. No es un modal (la vista es la pantalla entera) | 🟠 | F4 |
| 8.2 | Menú/popover/tooltip/toast | — | «Calidad» encaja en `Segment` (§12); sin toasts. `Tooltip` en los iconos de acción | 🟡 | F4 |
| 9.1 | Lámina de estado | `Dashboard.tsx:110` `Text size="sm"` «Esperando…» / «token rechazado» **como texto gris suelto**; sin lámina de error para servidor caído ni token rechazado | `EmptyModule layout="side" surface="glass" fill` × 3 estados: vacío (sin equipos), error (sin conexión, con reintento), bloqueado (token rechazado). **Un fallo pintado como vacío es 🔴** | 🔴 | F4 |
| 9.2 | Esqueletos | ninguno | `Skeleton` con la geometría de la tarjeta 16/9 mientras negocia WebRTC (`stream` sin llegar); `loading.tsx` de ruta | 🟠 | F4 |
| 10 | Rejilla y tarjeta única | `SimpleGrid` con **dos tarjetas distintas**: `Tile` (`:137`) y las miniaturas del foco (`:219`), radios 10 y 8, rellenos xs y 0 | Una sola tarjeta de equipo (`EquipoCard`) para las dos rejillas; `cols={{ base: 1, tablet: 2, laptop: 3, wide: 4 }}`… la receta dice `{ base: 2, tablet: 3, laptop: 4 }` para medios; aquí el vídeo pide 1 col en móvil → anotar | 🔴 | F4 |
| 10 | `Stat` para cifras | `fmtStats` como cadena «1280×720 · 30 fps · 349 kbps» | `Stat` sólo si se muestran como bloque; como sobreimpresión de la miniatura, `Badge size="sm" variant="outline"` + `Text ff="mono" fz="caption"` (decidir en F4) | 🟡 | F4 |
| 11 | Medios | `<video srcObject>` a mano en `VideoSurface` (`:333-352`), sin `controls` ✔ | **Hueco del catálogo**: `VideoPlayer` recibe `src` (URL), no un `MediaStream` de WebRTC. Se queda el `<video>` propio, sin controles, dentro de `AspectRatio` con props | 🟡 | F6 (hallazgo) |
| 11.4 | `MediaCard` | no | no aplica: no es un medio con póster ni pie con avatar; es vídeo en vivo. Se anota por qué | — | — |
| 12 | Formularios y navegación interna | «Calidad» = tres `Button` con `variant` según selección (`:55-62`) | `Segment data value onChange size="sm" variant="light"` (es un `radiogroup`) | 🟠 | F4 |
| 12 | Conmutador de acción | «Tomar control / Soltar control» = `Button` que cambia `color` a `red` (`:187-194`) | `Button` con `pressed`… no existe: usar `ActionIcon pressed variant="glass"` + etiqueta, o `Button variant={on ? "filled" : "glass"} color="error"` con `aria-pressed` | 🟠 | F4 |
| 13 | Tipografía y jerarquía | `Text size="sm"`/`"xs"` (prop de tamaño en vez de `fz`), `fontWeight: 700` en línea, `Badge variant="light"` para estado ✔ | `fz="body2"`, `fw="bold"`, tarjeta `Card variant="glass" withBorder r="xl"` (hoy `variant="outline" r="lg"`) | 🟠 | F4 |
| 14 | i18n | strings en JSX | `i18n/es.ts` tipado (`en: typeof es` si se quiere); el cliente recibe strings. Decidir si solo `es` | 🟠 | F5 |
| 15 | Anti-patrones | hex, px, texto gris por lámina, dos tarjetas, `Main` en panel | ver filas | — | — |
| 16 | Copias de Rosette | ninguna | ✔ nada que retirar | — | — |
| 17 | Checklist de cierre | — | se marca en el commit de cada pantalla | — | F4 |

### Recuentos (antes)

| Recuento | Valor |
| --- | --- |
| Componentes del producto que reimplementan uno de Nebula | **4**: `dot()` → `Indicator`/`StatusBadge` · `overlayTop` → `Badge` · cabecera a mano → `AppShell.Header` · «Calidad» con botones → `Segment` |
| Ficheros `.css.ts` / reglas que cubría una prop | 0 ficheros · 3 objetos `CSSProperties` + 12 `style={{}}` en línea; **~30 declaraciones**, de las que ~26 cubre una prop (`position`, `top`, `left`, `display`, `align`, `gap`, `p`, `r`, `bg`, `c`, `fz`, `ff`, `w`, `h`, `cursor`, `overflow`) |
| Hex / px de alto / transiciones a mano | **7 hex** · 2 px de alto (`dot` 8×8) + 5 radios y 2 `fontSize` en px · **0 transiciones** |

### Hallazgos de catálogo (no se arreglan aquí)

1. **Vídeo desde `MediaStream`.** `VideoPlayer` (ADR-195) y `Player` reciben `src: string`; un
   flujo WebRTC (`srcObject`) no tiene componente. Vela mantiene un `<video>` propio sin
   controles dentro de `AspectRatio`. Prop que faltaría: `VideoPlayer srcObject` o `stream`.
2. **`ThemeSeed.name` cerrado** a los 16 nombres (ya abierto en docs/07 §3).
3. **docs/07 §2 vs regla 1.5**: el snippet importa `base.css` **después** de `styles.css`, y
   como `@layer` ordena por primera declaración, `legacy` queda encima de las capas de Nebula.
   Propuesta: importar `base.css` antes (como hace N1 Fase 2) o declarar `@layer legacy` dentro
   de `styles.css` antes de las de Nebula.
4. **Sobreimpresión sobre vídeo.** No hay receta para rótulos sobre un medio en vivo (nombre,
   estado, cifras). Se usará `Badge`/`Text` posicionados con props (`position="absolute"`) sobre
   `surface.overlay.60`; se anota como patrón a validar.

## Checkpoint 1 · decisiones del propietario (cerradas el 2026-09-13)

| Decisión | Elegido |
| --- | --- |
| Tema | Primero **`vela` del catálogo** (lime + rose); el mismo día el propietario pidió poder ajustar colores, así que pasó a **semilla propia con la estructura de Rosette** (`theme/_seed.ts` + `index.ts`), arrancando con los colores de `vela` y los valores de sistema de Rosette (docs/07 §3). `pnpm brand` vuelca los hex a `brand/colors.json` para el logo y los iconos del agente. `ThemeSeed.name` ya es `string` en 1.1.14: el cast `as SeedName` que docs/07 §3 anota como hallazgo abierto ya no hace falta. |
| Nebula | **1.1.14** (publicada el 2026-09-13; trae ADR-187…198). `minimumReleaseAgeExclude` en `pnpm-workspace.yaml`. |
| Armazón | **`AppShell` en carril con barra**: marca, grupo «Panel» → «Equipos» (contador de conectados), pie con tema e idioma en `Popover`. |
| Foco | **Ruta dedicada `/equipos/[id]`**. La conexión WebRTC vive en `MonitorProvider` dentro del armazón: navegar no renegocia. |
| i18n | **`es`/`en`** tipados el uno del otro, idioma por cookie `vela-lang`, cambio desde el pie con `router.refresh()`. |
| AA | **No se exige.** El tema es el `vela` del catálogo; Nebula sólo certifica AA para `nebula`. Se dice aquí explícitamente. |

## Fase 6 · Veredicto

### La tabla, después

| § | Antes | Después | Sev. |
| --- | --- | --- | --- |
| 1.1 | 12 `style` en línea + 3 objetos CSS | **0** `style` en línea en componentes. Queda `BODY_STYLE` en `layout.tsx` (4 declaraciones con `vars.*`: la vía sin vanilla-extract que N1 §Fase 2 ofrece; decidido y escrito) | 🟢 |
| 1.2 | 7 hex, radios/px a mano | **0 hex, 0 transiciones**; alturas de esqueleto en `app/metrics.ts` con la cuenta | 🟢 |
| 1.3 | todo el panel `"use client"` | `layout.tsx`, `page.tsx`, `equipos/[id]/page.tsx`, `screen.tsx`, `grid-skeleton.tsx`, `loading.tsx`, `logo.tsx` de servidor. Islas: `shell.tsx` (armazón), `equipos-grid.tsx`, `equipo-card.tsx`, `equipos-header.tsx`, `video-surface.tsx`, `equipos/[id]/equipo.tsx` + `control-context.tsx` — todas viven de WebRTC o de estado del navegador | 🟢 |
| 1.5 | `legacy` bajo Nebula en el import, pero Next lo servía en la posición 11 | `base.css` + `styles.css` importados **también desde `shell.tsx`** (el CSS de las islas se sirve antes que el del layout) y `cssChunking: "strict"`: la primera hoja declara `legacy` y las seis capas en orden. Verificado en el HTML servido | 🟢 |
| 1.6–3 | semilla propia indigo/cyan | `@stellaria/nebula-themes/vela` + `/vela/web` | 🟢 |
| 1.7 | sin iconos | `theme/icons.tsx` con `CreateIcons({ ...AllIconsPack })`; `Icon name="monitor" \| "keyboard" \| "settings" \| "arrow-left" \| "activity" \| "lock"` | 🟢 |
| 1.8 | `Title order={3}` en la barra | `AppShell.Header order={1}` único por pantalla; tarjetas `Title fz="h5" order={3}`; «Otros equipos» `h6 order={2}` | 🟢 |
| 1.9 | mono a mano | `Text ff="mono" fz="caption"` (tarjeta) / `fz="body3"` (subtítulo de ficha) | 🟢 |
| 1.10 | puntos suspensivos | Copia revisada en `i18n/dictionaries/es.ts`: sin «…», sin exclamaciones, ninguna pantalla nombra a otra (la lámina de «no encontrado» dice «Volver a la lista», no «Equipos») | 🟢 |
| 2 | raíz sin `data-scroll-behavior`, `body` sin lienzo | `data-scroll-behavior="smooth"`, `body` con `surface.base`/`text.primary`/`font.sans`/`100dvh`, `robots noindex` | 🟢 |
| 6.1–6.3 | `Main` | `AppShell sidebar backdrop={StarField aurora density="sm" fixed parallax scroller}` con `mainProps` de §6.1; barra con `activeMode="pathname"` + `pathname={usePathname()}`; una entrada en la tira | 🟢 |
| 7.1 | cabecera a mano | `Screen` = `AppShell.Scroll` → `AppShell.Section sticky` → `AppShell.Header titleProps={{fz:"h5"}} subtitleProps={{fz:"body3",c:"text.muted"}}` → `Flex p={{base:"sm",tablet:"lg"}}` | 🟢 |
| 8.1 | foco por estado | ruta `/equipos/[id]` | 🟢 |
| 8.2 | — | tema e idioma en `Popover placement="right" withArrow width={240}`; sin toasts (no hay nada que llegue «de otra pantalla») | 🟢 |
| 9.1 | texto gris suelto | `EmptyModule layout="side" surface="glass" fill` × 4: vacío, sin conexión (con «Reintentar» `gradient` → `retry()`), token rechazado (`lock`, sin acción), equipo ya no conectado (con «Volver a la lista»). `useMonitor` distingue `offline` de `unauthorized` | 🟢 |
| 9.2 | sin esqueletos | `GridSkeleton` con la geometría de `EquipoCard`; `loading.tsx` en las dos rutas; esqueleto 16/9 mientras negocia el vídeo | 🟢 |
| 10 | dos tarjetas | **una** `EquipoCard` para la rejilla y para la tira de «Otros equipos». Columnas: `{ base:1, phone:1, tablet:2, laptop:3, desktop:3, wide:4 }` (vídeo 16/9: dos columnas a 390 px dejaban la cifra en dos líneas) | 🟢 |
| 11 | `<video>` a mano | sigue: hueco del catálogo (abajo). Sin `controls` | 🟡 |
| 12 | botones por calidad; control con `color="red"` | `Segment` + `Segment.Control` para calidad; control = `Button variant={on ? "filled" : "gradient"} color={on ? "error" : undefined} aria-pressed` | 🟢 |
| 13 | `size="sm"`, `fontWeight` | `fz`/`fw`; tarjetas `Card variant="glass" withBorder r="xl"`; láminas `r="lg"` (las pone `EmptyModule`) | 🟢 |
| 14 | strings en JSX | diccionarios; las islas reciben strings | 🟢 |

### Recuentos, antes → después

| Recuento | Antes | Después |
| --- | --- | --- |
| Componentes que reimplementan uno de Nebula | 4 | **0** (`VideoSurface` es un hueco, no una reimplementación) |
| `.css.ts` / reglas que cubría una prop | 0 / ~26 | **0 / 0** (`BODY_STYLE`: 4 declaraciones deliberadas) |
| Hex · px de alto · transiciones a mano | 7 · 2 · 0 | **0 · 0 fuera de `metrics.ts` · 0** |

### Copias desde docs/07 §16

Ninguna, ni antes ni después.

### Hallazgos de catálogo

1. **Vídeo desde `MediaStream`.** `VideoPlayer`/`Player` reciben `src: string`. Un flujo WebRTC
   necesita `srcObject`. Vela mantiene `app/video-surface.tsx` (un `Box component="video"` con
   props, sin `controls`). Prop que faltaría: `VideoPlayer stream` o `srcObject`.
2. **`Card` no acepta `component`**, así que una tarjeta-enlace de Next no puede ser `<Link>`:
   `href` daría un `<a>` a pelo (recarga completa, y aquí renegociaría todos los flujos). Se usa
   `onPress` + `router.push`, y la tarjeta pierde «abrir en pestaña nueva».
3. **`Button component={Link}` sale como `<a role="button">`.** Para «Todos los equipos» (una
   navegación) el rol correcto sería `link`. Alternativa del catálogo: `Anchor`/`ActionLink`.
4. **`Title` no tiene `truncate`** (`Text` sí). Un nombre de equipo largo envuelve.
5. **`EmptyModule` sin `illustration`**: las cinco ilustraciones son activos del producto y Vela
   no los tiene; se usa `icon`. Pendiente de diseño, no de Nebula.
6. **Claves de almacenamiento**: `DEFAULT_STORAGE_KEYS` es `data-theme`/`data-scheme`;
   `docs/02` §4 dice `nebula-theme`/`nebula-scheme`. Discrepancia de doc.
7. **`lucide-react` es peer opcional de `nebula-icons`** y los packs lo requieren: `pnpm add
   lucide-react` a mano o el build muere con «Can't resolve 'lucide-react'». No lo dice docs/07 §1.7.

### Propuestas a docs/07 (no editadas allí)

1. **§2, orden de imports.** El snippet importa `base.css` después de `styles.css`. `@layer`
   ordena por primera declaración: así `legacy` queda **encima** de las capas de Nebula, al revés
   de lo que dice la regla 1.5. Además, en App Router **el CSS de las islas de cliente se sirve
   antes que el del layout de servidor**: medido en Vela, Next servía el CSS de `Box`
   (`nebula.util`) en la primera hoja y `styles.css` en la segunda, con lo que `nebula.util`
   quedaba como la capa más baja y **los style props perdían contra los componentes**
   (`Title fz="h5"` pintaba `h1`). Receta que funcionó: importar `base.css` y `styles.css` desde
   la **primera isla de cliente del armazón** (antes de `@stellaria/nebula-web`) además de desde
   el layout, y `experimental.cssChunking: "strict"`. Merece una línea en §2 y en la guía
   `installation`.
2. **§1.7, coste del pack completo.** `{ ...AllIconsPack }` cuesta **8,6 kB brotli (q5)** más que
   registrar los seis iconos que usa el panel (medido: 288,1 → 279,5 kB de JS). Se mantiene la
   norma; conviene decirlo para que un producto pequeño decida.
3. **§10, columnas de una rejilla de vídeo.** `{ base: 2, tablet: 3, laptop: 4 }` es para
   medios 3/4; un vídeo 16/9 a 390 px en dos columnas deja la tarjeta en 170 px y las cifras en
   dos líneas. Vela usa `base: 1`.
4. **§6.1, `inlineCss`.** Nebula reparte 90+ hojas `.vanilla.css`; sin `experimental.inlineCss`
   Next emite **92 `<link>` bloqueantes** en el panel. CLAUDE.md de Nebula lo sabe («hojas CSS debe
   quedarse en 0»); docs/07 §2 no lo dice.
5. **`optimizePackageImports`**: el barrel de `nebula-web` arrastraba 1,17 MB crudos de JS; con
   `experimental.optimizePackageImports: ["@stellaria/nebula-web"]` el JS de la ruta baja de
   **435 a 288 kB brotli**. Es una línea de `next.config` que la guía `installation` debería
   traer.

### Lo que se retiró

`app/Dashboard.tsx` entero (cabecera a mano, dos tarjetas, `overlayTop`/`overlayBottom`/`dot`,
hex, `Main` como armazón de panel), `app/theme.ts` (semilla propia), los textos en JSX.

### Capturas (`docs/reviews/alineacion-vela-2026-09-13/`)

`grid-dark-1440`, `grid-light-1440`, `grid-light-768`, `grid-dark-390` (rejilla, dos esquemas,
tres anchos; a 390 la barra es la tira de abajo) · `control-dark-1440`, `control-light-768`
(ficha con control activo: `h1` = nombre, insignia «control activo», borde `error.500`) ·
`focus-dark-390` (ficha en móvil) · `state-empty`, `state-blocked`, `state-offline` (las tres
láminas; `offline` con «Reintentar» a 390).

### Peso de la ruta `/` (brotli, calidad 5; `next start`, sin agentes)

| | Crudo | br5 |
| --- | ---: | ---: |
| HTML (con todo el CSS en línea por `inlineCss`) | 1 031,9 kB | **58,5 kB** |
| · de eso, el tema (`<style>` de `ThemeScript`) | 49,4 kB | 6,3 kB |
| CSS como `<link>` | 0 | **0** (92 hojas → 0) |
| JS (15 chunks) | 1 092,7 kB | **288,1 kB** |
| **Total** | 2 124,6 kB | **346,6 kB** |

Antes de `inlineCss` + `optimizePackageImports`: HTML 20,0 + CSS 71,5 + JS 435,0 = **526,5 kB br5**.
El scaffolding original (1.0.0, `Main` + cuatro componentes, sin armazón ni láminas) pesaba
207 kB de First Load JS crudo según `next build`. El coste fijo del catálogo —`AppShell`,
`react-aria`, `motion`, `StarField`, `Popover`/`Select`/`Segment`— es lo que hay entre las dos
cifras; la decisión de si compensa es del propietario. Chunk mayor: `nebula-web` + `react-aria`
+ `motion`, 284 kB br5.

### Componentes de servidor / cliente

Servidor (7): `layout.tsx`, `page.tsx`, `equipos/[id]/page.tsx`, `screen.tsx`,
`grid-skeleton.tsx`, `loading.tsx` ×2, `logo.tsx`. Cliente (7): `shell.tsx` (armazón: estado
del carril, `usePathname`, `MonitorProvider`), `equipos-grid.tsx`, `equipo-card.tsx`
(`router.push`), `equipos-header.tsx`, `video-surface.tsx` (`srcObject`, listeners),
`equipos/[id]/equipo.tsx`, `equipos/[id]/control-context.tsx`. Todas las islas leen WebRTC o
estado del navegador; ninguna arrastró a cliente algo que pudiera ser de servidor.

### Gates

`tsc` limpio · `next build` verde · e2e de 17 comprobaciones en verde (agente → servidor →
rejilla → ruta de ficha → control con `aria-pressed` → preset → lámina de vacío → tema claro →
idioma `en` por cookie) · capturas miradas a 390/768/1440 en los dos esquemas.
