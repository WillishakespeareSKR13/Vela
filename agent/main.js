'use strict';

/**
 * Stellaria Agent — proceso principal (Electron).
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
 * defecto; se enciende con STELLARIA_SHOW_INDICATOR=1. La supervision se
 * comunica a las personas por politica interna, no con un aviso por instante.
 */

const path = require('path');
const os = require('os');
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
} = require('electron');

const SERVER_URL =
  process.env.STELLARIA_SERVER || process.env.MONITOR_SERVER || 'ws://localhost:8080';
const PC_NAME = process.env.STELLARIA_NAME || os.hostname();
const SHOW_INDICATOR = /^(1|true|yes|on)$/i.test(process.env.STELLARIA_SHOW_INDICATOR || '');

let tray = null;
let captureWin = null;
let indicatorWin = null;

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
    console.warn('[stellaria] nut-js no disponible, control remoto off:', err.message);
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
    console.warn('[stellaria] input:', err.message);
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
    `&indicator=${SHOW_INDICATOR ? '1' : '0'}`;
  captureWin.loadFile(path.join(__dirname, 'capture.html'), { search: q });
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
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWklEQVR4nGNgGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoAAAJ0gABBqgk0wAAAABJRU5ErkJggg=='
  );
}

function createTray() {
  tray = new Tray(trayIcon());
  const settings = app.getLoginItemSettings();
  tray.setToolTip(`Stellaria — ${PC_NAME}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Stellaria — ${PC_NAME}`, enabled: false },
      { type: 'separator' },
      {
        label: 'Ver estado de conexion',
        click: () => {
          if (captureWin) {
            captureWin.show();
            captureWin.webContents.openDevTools({ mode: 'detach' });
          }
        },
      },
      {
        label: 'Iniciar con Windows',
        type: 'checkbox',
        checked: settings.openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, openAsHidden: true }),
      },
      { type: 'separator' },
      { label: 'Salir', click: () => app.quit() },
    ])
  );
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

    createCaptureWindow();
    createTray();
    loadNut();
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });

    ipcMain.on('agent-input', (_e, ev) => applyInput(ev));
    ipcMain.on('agent-control-indicator', (_e, active) => showControlIndicator(!!active));
  });

  app.on('window-all-closed', (e) => e.preventDefault());
}
