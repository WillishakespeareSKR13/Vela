# Stellaria — supervisión de estaciones

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
- **`dashboard/`** — panel Next.js que consume el sistema de diseño **Nebula**
  (`@stellaria/nebula-web`). Cuadrícula de equipos, foco tipo Meet, métricas de
  FPS/resolución/bitrate, control de calidad y toma de control.

## Sobre transparencia y consentimiento (léelo)

Esto está construido como herramienta de supervisión **transparente**, no como
software espía:

- El agente **no se oculta**: aparece en la bandeja del sistema y en la pestaña
  de Inicio del Administrador de tareas. No evade el antivirus ni disfraza su
  proceso.
- El aviso en pantalla durante el control remoto es **configurable** y viene
  apagado (`STELLARIA_SHOW_INDICATOR=0`), para no sesgar chequeos de calidad
  aleatorios. Eso es distinto de ocultar que la supervisión existe.
- La base legal en casi cualquier jurisdicción es que **las personas
  supervisadas estén informadas** de que su equipo puede monitorizarse, como
  parte de sus condiciones de trabajo. El permiso del responsable por sí solo no
  suele bastar. Documenta ese aviso antes de desplegar.

## Requisitos

- Node.js 20+ y pnpm (para el dashboard) / npm.
- El dashboard necesita acceso al registro donde están publicados
  `@stellaria/nebula-*` (tu monorepo Nebula o tu registro privado).
- El agente compila el módulo nativo `@nut-tree-fork/nut-js` para el control de
  entrada; requiere las herramientas de build de Windows.

## 1) Servidor de señalización

```bash
cd server
npm install
PORT=8080 npm start
```

`GET /health` devuelve el estado. Para producción, ponlo tras TLS (`wss://`).

## 2) Agente (en cada PC supervisado)

```bash
cd agent
npm install
set STELLARIA_SERVER=ws://IP_DEL_SERVIDOR:8080
set STELLARIA_NAME=Recepcion-01
npm start            # prueba
npm run dist         # instalador Windows (NSIS), arranca al iniciar sesión
```

Variables:

| Variable | Por defecto | Qué hace |
| --- | --- | --- |
| `STELLARIA_SERVER` | `ws://localhost:8080` | URL del servidor de señalización |
| `STELLARIA_NAME` | hostname | Nombre que se ve en el dashboard |
| `STELLARIA_SHOW_INDICATOR` | `0` | `1` muestra el aviso en pantalla al controlar |

## 3) Dashboard

```bash
cd dashboard
pnpm install
echo "NEXT_PUBLIC_SIGNALING_URL=ws://IP_DEL_SERVIDOR:8080" > .env.local
pnpm dev            # http://localhost:3000
```

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
  Añade sus credenciales a `iceServers` en `agent/capture.html` y
  `dashboard/lib/useMonitor.ts`.

## Pendientes / mejoras

- Autenticación en el servidor de señalización (hoy cualquiera que llegue al
  puerto puede registrarse). Añadir tokens antes de exponerlo.
- TURN para despliegue fuera de la LAN.
- Multi-monitor (hoy captura la pantalla primaria).
- Agente nativo (Rust + Desktop Duplication API) si se quiere aún menos consumo
  que Electron.
# Vela
