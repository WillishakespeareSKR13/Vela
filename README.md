# Vela — supervisión de estaciones

Sistema de supervisión de pantallas en tiempo real con soporte remoto de mouse y
teclado, pensado para control de calidad. Tres piezas:

```
┌────────────┐   WebRTC (video + canal de control)   ┌────────────┐
│  agent/    │◄────────────────────────────────────►│ dashboard/ │
│ (Electron) │           señalización WS             │  (Next.js) │
└─────┬──────┘                                        └─────┬──────┘
      │                  ┌──────────────┐                   │
      └─────────────────►│   server/    │◄──────────────────┘
                         │ (WS signaling)│
                         └──────────────┘
```

- **`server/`** — servidor de señalización (WebSocket). Solo intercambia SDP/ICE;
  el video y el control viajan peer-to-peer, no pasan por aquí.
- **`agent/`** — app de Electron que corre en cada PC: captura la pantalla por
  WebRTC, arranca con Windows y vive en la bandeja del sistema. Aplica el
  mouse/teclado que llega del visor (nut-js).
- **`dashboard/`** — panel Next.js sobre el sistema de diseño **Nebula**
  (`@stellaria/nebula-web` 1.1.14, compuesto según sus recetas de producto).
  Rejilla de equipos (`/`), ficha de un equipo con toma de control
  (`/equipos/[id]`), métricas de FPS/resolución/bitrate, presets de calidad,
  tema claro/oscuro e idioma es/en.

## Sobre transparencia y consentimiento (léelo)

Esto está construido como herramienta de supervisión **transparente**, no como
software espía:

- El agente **no se oculta**: aparece en la bandeja del sistema y en la pestaña
  de Inicio del Administrador de tareas. No evade el antivirus ni disfraza su
  proceso.
- El aviso en pantalla durante el control remoto es **configurable** y viene
  apagado (`VELA_SHOW_INDICATOR=0`), para no sesgar chequeos de calidad
  aleatorios. Eso es distinto de ocultar que la supervisión existe.
- El acceso está protegido por un **token compartido** (`VELA_TOKEN`): sin él,
  nadie puede registrarse como agente ni como visor en el servidor.
- La base legal en casi cualquier jurisdicción es que **las personas
  supervisadas estén informadas** de que su equipo puede monitorizarse, como
  parte de sus condiciones de trabajo. El permiso del responsable por sí solo no
  suele bastar. Documenta ese aviso antes de desplegar.

## Requisitos

- Node.js 20+ y pnpm (para el dashboard) / npm.
- `@stellaria/nebula-*` está publicado en npm público (versiones pinneadas en
  `dashboard/package.json`); no hace falta registro privado.
- El agente usa el módulo nativo `@nut-tree-fork/nut-js` para el control de
  entrada. Trae binarios precompilados para Windows/macOS/Linux; si tu
  plataforma no tiene uno, necesita el toolchain de build de la plataforma.

## 1) Servidor de señalización

```bash
cd server
npm install
VELA_TOKEN=un-secreto-largo PORT=8080 npm start
npm test        # prueba de humo del protocolo (auth, relay, ICE), sin WebRTC
```

Sin `VELA_TOKEN` el servidor **no arranca**; para una prueba rápida en LAN
puedes forzar modo anónimo con `VELA_ALLOW_ANON=1`, pero no lo expongas así.

| Variable | Por defecto | Qué hace |
| --- | --- | --- |
| `PORT` | `8080` | Puerto HTTP/WS |
| `VELA_TOKEN` | — | Token compartido que deben presentar agentes y visores en `register` |
| `VELA_ALLOW_ANON` | `0` | `1` acepta registros sin token (solo desarrollo) |
| `VELA_STUN_URL` | `stun:stun.l.google.com:19302` | STUN (varios: separados por coma) |
| `VELA_TURN_URL` | — | TURN, p. ej. `turn:turn.midominio.com:3478?transport=udp` |
| `VELA_TURN_SECRET` | — | Secreto de coturn (`static-auth-secret`): credenciales temporales |
| `VELA_TURN_TTL` | `86400` | Vida en segundos de esas credenciales |
| `VELA_TURN_USER` / `VELA_TURN_PASS` | — | Alternativa: usuario estático (`lt-cred-mech`) |
| `VELA_ICE_RELAY_ONLY` | `0` | `1` fuerza que todo el tráfico pase por TURN |

`GET /health` devuelve el estado. Para producción, ponlo tras TLS (`wss://`).

Protocolo: el cliente manda `register {role, name, token}`; si el token es
válido recibe `registered {id, role, iceServers[, iceTransportPolicy]}` y a
partir de ahí se relevan `subscribe`/`offer`/`answer`/`ice`. Con token inválido
recibe `error {code:"unauthorized"}` y el socket se cierra con código 4401.

## 2) Agente (en cada PC supervisado)

```bash
cd agent
npm install
set VELA_SERVER=ws://IP_DEL_SERVIDOR:8080
set VELA_TOKEN=un-secreto-largo
set VELA_NAME=Recepcion-01
npm start            # prueba
npm run dist         # instalador Windows (NSIS), arranca al iniciar sesión
```

Variables (`STELLARIA_*` sigue aceptándose como alias de las instalaciones
antiguas):

| Variable | Por defecto | Qué hace |
| --- | --- | --- |
| `VELA_SERVER` | `wss://api.vela.stellaria.app` | URL del servidor de señalización (en desarrollo, `ws://localhost:8080`) |
| `VELA_TOKEN` | — | Token compartido (el mismo que `VELA_TOKEN` del servidor) |
| `VELA_NAME` | hostname | Nombre que se ve en el dashboard |
| `VELA_SHOW_INDICATOR` | `0` | `1` muestra el aviso en pantalla al controlar |

Los `iceServers` (STUN/TURN) no se configuran aquí: los entrega el servidor al
registrarse. El arranque automático con la sesión solo se registra desde el
instalador de Windows; `npm start` no toca los ítems de inicio del sistema.

### Agente en macOS (desarrollo)

Funciona igual (`npm install && npm start`) con dos particularidades:

- **Ejecuta `npm install` desde tu propia Terminal**, no desde un shell
  sandboxeado (p. ej. un asistente de código). Si el binario de Electron se
  descarga desde un proceso con sandbox, macOS le añade `com.apple.provenance`
  y Gatekeeper lo bloquea al arrancar («"Electron" dañará tu ordenador») y lo
  manda a la Papelera. Si ya pasó: `rm -rf node_modules/electron
  ~/Library/Caches/electron` y vuelve a instalar desde la Terminal. Si aun así
  Gatekeeper protesta con una dependencia que instalaste tú, quita los
  atributos: `xattr -cr node_modules/electron/dist/Electron.app`.
- npm 11 pide aprobar el postinstall de Electron:
  `npm install-scripts approve electron`.
- macOS pedirá **Grabación de pantalla** (captura) y **Accesibilidad**
  (mouse/teclado con nut-js) en Ajustes → Privacidad y seguridad. En
  desarrollo se conceden a «Electron»; empaquetado, a «Vela Agent».
- Para distribuir en Mac hace falta firmar y notarizar con un Developer ID
  (target `mac` de electron-builder); no está configurado.

## 3) Dashboard

```bash
cd dashboard
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_SIGNALING_URL y NEXT_PUBLIC_SIGNALING_TOKEN
pnpm dev            # http://localhost:3000
```

`NEXT_PUBLIC_SIGNALING_TOKEN` acaba en el bundle del navegador: quien pueda
abrir el dashboard tiene el token. Protege el acceso al dashboard aparte (VPN,
proxy con login) y no lo publiques abierto a internet. Si el servidor rechaza
el token, el panel lo dice con una lámina propia («El servidor rechazó el
token»), distinta de «sin conexión» y de «ningún equipo conectado».

Cómo está montado (la norma es `docs/07-recetas-de-producto.md` de Nebula y la
auditoría vive en `docs/reviews/alineacion-vela-2026-09-13.md`):

- `theme/`: misma estructura que Rosette. `_seed.ts` es **la semilla** (del
  producto es sólo el color: `primary`, `accent`, `from`, `to`, `tint`; el
  resto se copia de Rosette), `index.ts` la compila con `CompileThemes`,
  `icons.tsx` es el registro tipado de iconos. Parte de los colores del tema
  `vela` del catálogo (lime + rose). Para probar otros colores cambia las
  paletas en `_seed.ts`, mira el panel, y corre `pnpm brand`: vuelca los hex a
  `brand/colors.json`, reescribe el degradado de `public/icon.svg` con
  `from`/`to` de la semilla y rasteriza (con `sharp`) el favicon del panel
  (`app/icon.svg`, `app/apple-icon.png`) y los iconos del agente (icono de app
  para el instalador, cabecera de la ventana, tray de Windows y tray template
  de macOS) más `agent/assets/brand.css`. Los SVG fuente son `public/icon.svg`
  (glifo sobre placa), `public/tray.svg` (glifo solo) y `public/vela.svg`
  (wordmark); `app/brand.tsx` los pinta en línea con las vars del tema. Un
  solo origen para el logo y el panel.
- `app/shell.tsx`: `AppShell` en carril (barra con marca, «Equipos», y tema e
  idioma en el pie). La conexión WebRTC vive en `lib/monitor-context.tsx`,
  dentro del armazón, para que navegar entre la rejilla y una ficha no
  renegocie los flujos.
- `app/screen.tsx`: toda pantalla es una cabecera pegada con `h1` único +
  cuerpo. Las páginas son de servidor; las islas de cliente son las que viven
  de WebRTC.
- `i18n/`: diccionarios `es`/`en` tipados el uno del otro; el idioma va por
  cookie (`vela-lang`) y se cambia desde el pie de la barra.
- `next.config.mjs`: `cssChunking: "strict"`, `inlineCss` y
  `optimizePackageImports` — sin ellos Next servía el CSS de `Box` antes que
  la declaración de capas de Nebula y los style props perdían.

- Clic en un equipo para enfocarlo (tipo Meet); «Ver todos» vuelve a la rejilla.
- «Tomar control» envía mouse y teclado al equipo enfocado por el canal de datos.
- «Calidad» (alta/media/baja) ajusta bitrate y FPS del lado del agente.

## Calidad y rendimiento

WebRTC usa codificación acelerada por hardware (H.264/VP8/VP9) y bitrate
adaptativo. Es bastante más rápido y ligero que capturar cuadros por canvas y
mandarlos por WebSocket, que es lo que suele hacer lento a una extensión de
Chrome. Presets en `agent/capture.html` (`QUALITY`).

## Redes

- **Misma LAN:** funciona directo con el STUN público que ya trae.
- **Entre redes / internet:** hace falta un servidor **TURN** (p. ej. coturn).
  Se configura solo en el servidor de señalización (`VELA_TURN_*`), que entrega
  las credenciales a agentes y visores ya autenticados. Con `VELA_TURN_SECRET`
  genera credenciales temporales (TURN REST API), que es lo recomendable:

  ```
  # /etc/turnserver.conf (coturn)
  listening-port=3478
  realm=vela
  use-auth-secret
  static-auth-secret=EL_MISMO_VALOR_QUE_VELA_TURN_SECRET
  fingerprint
  no-multicast-peers
  ```

  ```bash
  VELA_TOKEN=... VELA_TURN_URL=turn:turn.midominio.com:3478?transport=udp \
  VELA_TURN_SECRET=... npm start
  ```

  Con `VELA_ICE_RELAY_ONLY=1` puedes comprobar que el TURN funciona forzando
  que todo pase por él.

## Descargas del agente (Windows y macOS)

`agent/` compila con electron-builder: `npm run dist:win` (NSIS x64) y
`npm run dist:mac` (DMG arm64 + x64). Sin firma de código: en macOS se abre la
primera vez con clic derecho → Abrir; en Windows SmartScreen avisa. Cuando haya
certificado (Developer ID / Authenticode) se añade en `build.mac.identity` y
`build.win.certificateFile`.

- **Desde un Mac con Apple Silicon** el target de Windows necesita Rosetta
  (`softwareupdate --install-rosetta`), porque el `wine` que trae
  electron-builder es x86_64. Sin ella, el `.exe` lo hace el workflow.
- **Workflow `release-agent`** (`.github/workflows/release-agent.yml`):
  `git tag v0.1.0 && git push --tags` compila en runners de Windows y macOS y
  publica los ficheros en un GitHub Release.
- **`/descargas` en el dashboard** lee el último Release por la API de GitHub
  (cache de 5 min) y ofrece los tres ficheros más el `config.json` ya relleno
  con la URL de señalización y el token. Con repo privado o para subir el
  límite de peticiones: `GITHUB_TOKEN` en el entorno del dashboard;
  `VELA_GITHUB_REPO` si el repo no es `WillishakespeareSKR13/Vela`.

Al arrancar, el agente abre una **ventana de estado** sólo si falta algo:
permisos de macOS (Grabación de pantalla, Accesibilidad — con un botón por
permiso que abre el panel correcto de Ajustes del Sistema y se actualiza solo
al concederlo) o el token. Desde ahí, «Ocultar en la bandeja» lo manda al
tray; el icono del tray abre/oculta la ventana con clic izquierdo y con clic
derecho da el menú (estado, carpeta de configuración, registro, iniciar con la
sesión, salir). Cerrar la ventana no cierra el agente. En macOS la app no tiene
icono en el Dock (`LSUIElement`): vive en la barra de menús.

El `.app` de macOS va **firmado ad-hoc** (`scripts/adhoc-sign.js`, afterPack):
sin eso, en Apple Silicon un binario sin firma no arranca. Gatekeeper sigue
pidiendo clic derecho → Abrir la primera vez hasta que haya Developer ID y
notarización.

El agente instalado lee la configuración de `config.json` en su carpeta de
datos (`%APPDATA%\Vela Agent` · `~/Library/Application Support/Vela Agent`),
de `vela.json` junto al ejecutable, o de `VELA_CONFIG=<ruta>`; las variables
`VELA_*` ganan si están. El menú de la bandeja tiene «Abrir carpeta de
configuración», que crea el fichero con los valores actuales. Ejemplo en
`agent/config.example.json`.

## Despliegue en Railway

Dos servicios en un mismo proyecto, cada uno con su **Root Directory**:

| Servicio | Root Directory | Variables |
| --- | --- | --- |
| `server` | `server` | `VELA_TOKEN` (obligatoria), `VELA_TURN_*` si hay TURN. `PORT` la pone Railway |
| `dashboard` | `dashboard` | `NEXT_PUBLIC_SIGNALING_URL=wss://api.vela.stellaria.app` (el dominio del server), `NEXT_PUBLIC_SIGNALING_TOKEN=<el mismo VELA_TOKEN>`, opcional `GITHUB_TOKEN` |

Cada carpeta trae su `railway.json` (comando de arranque y healthcheck:
`/health` en el server, `/robots.txt` en el dashboard). El server se construye
con Nixpacks; el **dashboard con su `Dockerfile`** (Node 22 + pnpm 11 instalado
con npm): Nixpacks activa corepack al ver `packageManager` y el shim de pnpm 11
revienta en Node 24 (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`). Las
`NEXT_PUBLIC_*` llegan al build como `ARG` (Railway las pasa solas si el
Dockerfile las declara).

1. Crea el servicio `server` desde el repo, Root Directory `server`, añade
   `VELA_TOKEN` y genera un dominio público (Settings → Networking). Railway
   termina TLS: la URL será `wss://…up.railway.app`.
2. Crea el servicio `dashboard`, Root Directory `dashboard`, con las dos
   variables `NEXT_PUBLIC_*` **antes** del primer build (van dentro del bundle).
   Nixpacks detecta pnpm por `packageManager`; el lockfile ya está.
3. Los agentes apuntan a `wss://…` con el mismo token; el `config.json` de
   `/descargas` sale ya con esa URL.

Lo que Railway no da: **UDP**. coturn (TURN) no puede correr ahí; en la LAN no
hace falta, y fuera de ella se usa un TURN aparte (un VPS con coturn, o uno
gestionado) y se le pasa al server con `VELA_TURN_*`. El dashboard es
dinámico (idioma por cookie), así que va como servidor Node, no como export
estático. Protege el dominio del dashboard (el token viaja en su bundle): un
proxy con login o restricción por red delante.

## Prueba end-to-end

- `server/`: `npm test` levanta el servidor con token y TURN y verifica el
  protocolo completo (rechazo sin token, `registered` con credenciales HMAC,
  relay, `peer-left`).
- Flujo completo (agente → servidor → dashboard: video, ruta de ficha, control,
  presets, láminas de estado, tema e idioma) probado con `agent/capture.html`
  cargado en Chromium headless contra el dashboard compilado; el agente
  Electron empaquetado se prueba en el Windows destino.

## Pendientes / mejoras

- Multi-monitor (hoy captura la pantalla primaria).
- Agente nativo (Rust + Desktop Duplication API) si se quiere aún menos consumo
  que Electron.
