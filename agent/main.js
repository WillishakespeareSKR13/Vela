'use strict';

/**
 * Vela Agent — proceso principal (Electron).
 *
 * Responsabilidades:
 *   - Arrancar con Windows (login item) y vivir en la bandeja del sistema
 *     con un icono simple. El proceso es visible; no se oculta.
 *   - Alojar una ventana OCULTA (renderer) que captura la pantalla y hace
 *     el transporte WebRTC (ver capture.html).
 *   - Aplicar los eventos de mouse/teclado que llegan del visor (nut-js).
 *
 * Diseno "no invasivo": sin recuadro rojo ni icono REC en la pantalla
 * supervisada. El indicador en pantalla existe pero esta APAGADO por
 * defecto; se enciende con VELA_SHOW_INDICATOR=1. La supervision se
 * comunica a las personas por politica interna, no con un aviso por instante.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  screen,
  session,
  desktopCapturer,
  ipcMain,
  nativeImage,
  shell,
  systemPreferences,
} = require('electron');

const IS_MAC = process.platform === 'darwin';

// -------------------------------------------------------------------------
// Configuracion. Tres fuentes, de mas a menos prioridad:
//   1. Variables de entorno VELA_* (STELLARIA_* se acepta como alias viejo).
//   2. Un fichero JSON: VELA_CONFIG=<ruta>, o `vela.json` junto al ejecutable
//      (instalacion portable), o `config.json` en la carpeta de datos del
//      usuario (%APPDATA%/Vela Agent en Windows, ~/Library/Application
//      Support/Vela Agent en macOS). Claves: server, token, name, showIndicator.
//   3. Valores por defecto.
// El instalador no pide nada: el soporte deja el config.json y listo.
// -------------------------------------------------------------------------
function readConfigFile() {
  const candidates = [
    process.env.VELA_CONFIG,
    path.join(path.dirname(process.execPath), 'vela.json'),
    path.join(app.getPath('userData'), 'config.json'),
  ].filter(Boolean);
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
      console.log('[vela] configuracion leida de', file);
      return { file, ...cfg };
    } catch (err) {
      console.warn('[vela] no se pudo leer', file, err.message);
    }
  }
  return { file: path.join(app.getPath('userData'), 'config.json') };
}

const FILE_CONFIG = readConfigFile();
const env = (name, key, fallback) =>
  process.env['VELA_' + name] ??
  process.env['STELLARIA_' + name] ??
  (FILE_CONFIG[key] !== undefined && FILE_CONFIG[key] !== null ? String(FILE_CONFIG[key]) : fallback);

// Servidor por defecto: produccion. Asi el instalador sale apuntando bien y
// solo hace falta el token; en desarrollo se pone VELA_SERVER=ws://localhost:8080.
const DEFAULT_SERVER = 'wss://api.vela.stellaria.app';
// Token por defecto (decision del propietario, 2026-09-13): el instalador sale
// listo sin escribir config.json. Cualquiera con el instalador puede registrar
// equipos; si el token se filtra, se rota aqui y en el servidor.
const DEFAULT_TOKEN = 'fd89a4c9ac8d87a70834f0b5e06667dc3fcd2c8ea668cb34806f5d87ba1a2e67';
const SERVER_URL = env('SERVER', 'server', process.env.MONITOR_SERVER || DEFAULT_SERVER);
const PC_NAME = env('NAME', 'name', os.hostname());
const TOKEN = env('TOKEN', 'token', DEFAULT_TOKEN);
const SHOW_INDICATOR = /^(1|true|yes|on)$/i.test(env('SHOW_INDICATOR', 'showIndicator', ''));

if (!TOKEN) {
  console.warn(
    `[vela] sin token: el servidor rechazara el registro. Define VELA_TOKEN o escribe ${FILE_CONFIG.file}`
  );
}

let tray = null;
let captureWin = null;
let indicatorWin = null;
let statusWin = null;

// -------------------------------------------------------------------------
// Estado que ve la ventana de estado y el menu del tray.
// -------------------------------------------------------------------------
const state = {
  platform: process.platform,
  version: app.getVersion(),
  server: SERVER_URL,
  name: PC_NAME,
  hasToken: !!TOKEN,
  configFile: FILE_CONFIG.file,
  connection: 'connecting', // connecting | online | offline | unauthorized
  viewers: 0,
  permissions: { screen: true, accessibility: true },
};

function readPermissions() {
  if (!IS_MAC) return { screen: true, accessibility: true };
  return {
    screen: systemPreferences.getMediaAccessStatus('screen') === 'granted',
    accessibility: systemPreferences.isTrustedAccessibilityClient(false),
  };
}

function publishState(patch) {
  Object.assign(state, patch);
  state.permissions = readPermissions();
  if (statusWin && !statusWin.isDestroyed()) statusWin.webContents.send('state', state);
  if (tray) {
    tray.setToolTip(`Vela — ${PC_NAME} · ${LABELS[state.connection]}`);
    tray.setContextMenu(buildTrayMenu());
  }
}

const LABELS = {
  connecting: 'conectando',
  online: 'en linea',
  offline: 'sin conexion',
  unauthorized: 'token rechazado',
};

// -------------------------------------------------------------------------
// Inyeccion de mouse/teclado (nut-js), cargada de forma perezosa.
// -------------------------------------------------------------------------
let nut = null;
const nutScreen = { w: 1920, h: 1080 };

async function loadNut() {
  if (nut) return nut;
  try {
    nut = require('@nut-tree-fork/nut-js');
    nut.mouse.config.mouseSpeed = 3000;
    nut.mouse.config.autoDelayMs = 0;
    nut.keyboard.config.autoDelayMs = 0;
    nutScreen.w = await nut.screen.width();
    nutScreen.h = await nut.screen.height();
  } catch (err) {
    console.warn('[vela] nut-js no disponible, control remoto off:', err.message);
    nut = null;
  }
  return nut;
}

function buildKeyMap(Key) {
  const m = {
    Escape: Key.Escape, Tab: Key.Tab, CapsLock: Key.CapsLock,
    Space: Key.Space, Enter: Key.Enter, Backspace: Key.Backspace, Delete: Key.Delete,
    ShiftLeft: Key.LeftShift, ShiftRight: Key.RightShift,
    ControlLeft: Key.LeftControl, ControlRight: Key.RightControl,
    AltLeft: Key.LeftAlt, AltRight: Key.RightAlt,
    MetaLeft: Key.LeftSuper, MetaRight: Key.RightSuper,
    ArrowUp: Key.Up, ArrowDown: Key.Down, ArrowLeft: Key.Left, ArrowRight: Key.Right,
    Home: Key.Home, End: Key.End, PageUp: Key.PageUp, PageDown: Key.PageDown,
    Insert: Key.Insert,
    Minus: Key.Minus, Equal: Key.Equal,
    BracketLeft: Key.LeftBracket, BracketRight: Key.RightBracket,
    Semicolon: Key.Semicolon, Quote: Key.Quote, Backquote: Key.Grave,
    Backslash: Key.Backslash, Comma: Key.Comma, Period: Key.Period, Slash: Key.Slash,
  };
  for (let i = 0; i < 26; i++) m['Key' + String.fromCharCode(65 + i)] = Key[String.fromCharCode(65 + i)];
  for (let i = 0; i <= 9; i++) {
    m['Digit' + i] = Key['Num' + i];
    if (Key['NumPad' + i] !== undefined) m['Numpad' + i] = Key['NumPad' + i];
  }
  for (let i = 1; i <= 12; i++) m['F' + i] = Key['F' + i];
  return m;
}
let KEYMAP = null;

async function applyInput(ev) {
  const n = await loadNut();
  if (!n) return;
  const { mouse, keyboard, Point, Button, Key } = n;
  if (!KEYMAP) KEYMAP = buildKeyMap(Key);
  try {
    switch (ev.t) {
      case 'move':
        await mouse.setPosition(new Point(Math.round(ev.x * nutScreen.w), Math.round(ev.y * nutScreen.h)));
        break;
      case 'down':
      case 'up': {
        const btn = ev.button === 2 ? Button.RIGHT : ev.button === 1 ? Button.MIDDLE : Button.LEFT;
        await (ev.t === 'down' ? mouse.pressButton(btn) : mouse.releaseButton(btn));
        break;
      }
      case 'wheel':
        if (ev.dy > 0) await mouse.scrollDown(Math.min(10, Math.abs(ev.dy)));
        else if (ev.dy < 0) await mouse.scrollUp(Math.min(10, Math.abs(ev.dy)));
        break;
      case 'kdown':
      case 'kup': {
        const key = KEYMAP[ev.code];
        if (key === undefined) break;
        await (ev.t === 'kdown' ? keyboard.pressKey(key) : keyboard.releaseKey(key));
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.warn('[vela] input:', err.message);
  }
}

// -------------------------------------------------------------------------
// Ventanas
// -------------------------------------------------------------------------
function createCaptureWindow() {
  captureWin = new BrowserWindow({
    width: 480,
    height: 320,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  const q =
    `?server=${encodeURIComponent(SERVER_URL)}` +
    `&name=${encodeURIComponent(PC_NAME)}` +
    `&token=${encodeURIComponent(TOKEN)}` +
    `&indicator=${SHOW_INDICATOR ? '1' : '0'}`;
  captureWin.loadFile(path.join(__dirname, 'capture.html'), { search: q });
}

// Ventana de estado y permisos. Es la unica ventana visible del agente: la
// abre el icono del tray (o el arranque, si faltan permisos o el token) y el
// boton «Ocultar» la devuelve al tray sin cerrar nada.
function createStatusWindow() {
  if (statusWin && !statusWin.isDestroyed()) return statusWin;
  statusWin = new BrowserWindow({
    width: 440,
    height: 560,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title: 'Vela Agent',
    // En Windows/Linux la ventana lleva el icono de la app; en macOS lo pone el bundle.
    icon: IS_MAC ? undefined : path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#161a1f',
    webPreferences: {
      preload: path.join(__dirname, 'preload-status.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  statusWin.setMenuBarVisibility(false);
  statusWin.loadFile(path.join(__dirname, 'status.html'));
  statusWin.once('ready-to-show', () => publishState({}));
  // Cerrar la ventana es ocultarla: el agente sigue en el tray.
  statusWin.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      statusWin.hide();
    }
  });
  statusWin.on('closed', () => {
    statusWin = null;
  });
  return statusWin;
}

function showStatusWindow() {
  const win = createStatusWindow();
  win.show();
  win.focus();
  if (IS_MAC) app.dock?.show?.();
}

function hideStatusWindow() {
  if (statusWin && !statusWin.isDestroyed()) statusWin.hide();
  if (IS_MAC) app.dock?.hide?.();
}

function toggleStatusWindow() {
  if (statusWin && !statusWin.isDestroyed() && statusWin.isVisible()) hideStatusWindow();
  else showStatusWindow();
}

// Mientras la ventana esta a la vista, los permisos se releen cada 2 s: el
// usuario los concede en Ajustes del Sistema y la ventana se actualiza sola.
setInterval(() => {
  if (statusWin && !statusWin.isDestroyed() && statusWin.isVisible()) publishState({});
}, 2000);

// macOS ata cada permiso a la FIRMA de la app. Con firma ad-hoc (sin Developer
// ID) cada build firma distinto: la entrada «Vela Agent» sigue marcada en
// Ajustes pero ya no vale para el binario nuevo, y el permiso sale como no
// concedido. `tccutil reset` borra esa entrada vieja para que la nueva
// peticion la vuelva a crear bien. Solo toca las entradas de esta app.
function resetPermission(service) {
  if (!IS_MAC) return;
  try {
    require('child_process').execFileSync('/usr/bin/tccutil', ['reset', service, 'com.vela.agent'], {
      stdio: 'ignore',
      timeout: 5000,
    });
  } catch (err) {
    console.warn('[vela] tccutil reset', service, err.message);
  }
}

async function requestPermission(kind) {
  if (!IS_MAC) return;
  if (kind === 'screen') {
    if (systemPreferences.getMediaAccessStatus('screen') !== 'granted') resetPermission('ScreenCapture');
    // Pedir fuentes dispara el aviso del sistema la primera vez; despues, el panel.
    try {
      await desktopCapturer.getSources({ types: ['screen'] });
    } catch {
      /* noop */
    }
    if (systemPreferences.getMediaAccessStatus('screen') !== 'granted') {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    }
  } else if (kind === 'accessibility') {
    if (!systemPreferences.isTrustedAccessibilityClient(false)) resetPermission('Accessibility');
    systemPreferences.isTrustedAccessibilityClient(true);
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
  }
  publishState({});
}

function resetAllPermissions() {
  resetPermission('ScreenCapture');
  resetPermission('Accessibility');
  publishState({});
}

function openConfigFolder() {
  const dir = path.dirname(FILE_CONFIG.file);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE_CONFIG.file)) {
    fs.writeFileSync(
      FILE_CONFIG.file,
      JSON.stringify({ server: SERVER_URL, token: TOKEN, name: PC_NAME, showIndicator: SHOW_INDICATOR }, null, 2)
    );
  }
  shell.showItemInFolder(FILE_CONFIG.file);
}

function showControlIndicator(active) {
  if (active) {
    if (indicatorWin && !indicatorWin.isDestroyed()) return;
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    indicatorWin = new BrowserWindow({
      width: 260, height: 44, x: Math.round(width / 2 - 130), y: 12,
      frame: false, transparent: true, resizable: false, movable: false,
      focusable: false, skipTaskbar: true, alwaysOnTop: true,
      webPreferences: { contextIsolation: true },
    });
    indicatorWin.setIgnoreMouseEvents(true);
    indicatorWin.setAlwaysOnTop(true, 'screen-saver');
    indicatorWin.loadURL(
      'data:text/html,' +
        encodeURIComponent(
          `<body style="margin:0;font-family:Segoe UI,system-ui,sans-serif">
             <div style="display:flex;align-items:center;gap:8px;background:#b3261e;color:#fff;
                         border-radius:8px;padding:10px 14px;font-size:13px;font-weight:600;
                         box-shadow:0 2px 10px rgba(0,0,0,.35)">
               <span style="width:10px;height:10px;border-radius:50%;background:#fff;animation:p 1s infinite"></span>
               Sesion de soporte remoto activa
             </div>
             <style>@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}</style>
           </body>`
        )
    );
  } else if (indicatorWin && !indicatorWin.isDestroyed()) {
    indicatorWin.close();
    indicatorWin = null;
  }
}

function trayIcon() {
  // macOS: imagen «template» (negra con alfa), el sistema la pinta segun la
  // barra. Windows/Linux: el glifo con el degradado de marca. Ambas las genera
  // scripts/gen-icons.js desde brand/colors.json.
  const file = IS_MAC ? 'trayTemplate.png' : 'tray.png';
  const img = nativeImage.createFromPath(path.join(__dirname, 'assets', file));
  if (IS_MAC) img.setTemplateImage(true);
  return img;
}

function buildTrayMenu() {
  const settings = app.getLoginItemSettings();
  const visible = statusWin && !statusWin.isDestroyed() && statusWin.isVisible();
  const perms = state.permissions;
  const items = [
    { label: `Vela Agent — ${PC_NAME}`, enabled: false },
    { label: `Estado: ${LABELS[state.connection]}${state.viewers ? ` · ${state.viewers} visor(es)` : ''}`, enabled: false },
  ];
  if (IS_MAC && (!perms.screen || !perms.accessibility)) {
    items.push({ label: 'Faltan permisos: abre la ventana', enabled: false });
  }
  items.push(
    { type: 'separator' },
    { label: visible ? 'Ocultar ventana' : 'Abrir ventana', click: toggleStatusWindow },
    { label: 'Abrir carpeta de configuracion', click: openConfigFolder },
    {
      label: 'Ver registro de conexion',
      click: () => {
        if (captureWin) {
          captureWin.show();
          captureWin.webContents.openDevTools({ mode: 'detach' });
        }
      },
    },
    {
      label: IS_MAC ? 'Iniciar con la sesion' : 'Iniciar con Windows',
      type: 'checkbox',
      checked: settings.openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, openAsHidden: true }),
    },
    { type: 'separator' },
    {
      label: 'Salir de Vela Agent',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    }
  );
  return Menu.buildFromTemplate(items);
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip(`Vela — ${PC_NAME}`);
  tray.setContextMenu(buildTrayMenu());
  // Clic izquierdo: abrir/ocultar la ventana. El menu sale con clic derecho
  // (y en macOS tambien con clic izquierdo si no hay ventana que mostrar).
  tray.on('click', () => toggleStatusWindow());
  tray.on('right-click', () => tray.popUpContextMenu(buildTrayMenu()));
}

// -------------------------------------------------------------------------
// Ciclo de vida
// -------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    session.defaultSession.setDisplayMediaRequestHandler(
      (request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
          callback({ video: sources[0], audio: false });
        });
      },
      { useSystemPicker: false }
    );

    if (IS_MAC) app.dock?.hide?.();
    createCaptureWindow();
    createTray();
    loadNut();

    // Al arrancar, la ventana solo se abre si hace falta hacer algo: conceder
    // permisos (macOS) o poner el token. Con todo en orden, el agente nace en
    // el tray y no molesta.
    const perms = readPermissions();
    if (!TOKEN || !perms.screen || !perms.accessibility) showStatusWindow();
    // Solo la app empaquetada registra el arranque con la sesion; en
    // desarrollo (electron .) no tocamos los items de inicio del sistema.
    if (app.isPackaged) {
      app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });
    }

    ipcMain.on('agent-input', (_e, ev) => applyInput(ev));
    ipcMain.on('agent-control-indicator', (_e, active) => showControlIndicator(!!active));
    ipcMain.on('agent-status', (_e, patch) => publishState(patch || {}));

    // Ventana de estado
    ipcMain.handle('status-get', () => {
      publishState({});
      return state;
    });
    ipcMain.on('status-hide', () => hideStatusWindow());
    ipcMain.on('status-open-config', () => openConfigFolder());
    ipcMain.on('status-permission', (_e, kind) => requestPermission(kind));
    ipcMain.on('status-reset-permissions', () => resetAllPermissions());
    ipcMain.on('status-quit', () => {
      app.isQuitting = true;
      app.quit();
    });
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
  });
  // macOS: clic en el icono del Dock (si esta visible) reabre la ventana.
  app.on('activate', () => showStatusWindow());

  app.on('window-all-closed', (e) => e.preventDefault());
}
