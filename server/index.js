'use strict';

/**
 * Vela — servidor de senalizacion WebRTC.
 *
 * Este proceso NO transporta video ni eventos de entrada: unicamente
 * intercambia los mensajes de establecimiento de conexion (SDP y ICE)
 * entre agentes (PCs monitorizados) y visores (dashboard). El video y el
 * control de mouse/teclado viajan peer-to-peer por WebRTC una vez que la
 * conexion queda establecida.
 *
 * Roles:
 *   - "agent"  : cada PC monitorizado. Publica su pantalla.
 *   - "viewer" : el dashboard. Se suscribe a uno o varios agentes.
 *
 * Autenticacion: token compartido (VELA_TOKEN). El cliente lo manda en el
 * mensaje `register`; hasta que no se registra con exito no se le releva
 * nada. Sin VELA_TOKEN el servidor se niega a arrancar, salvo que se pida
 * explicitamente modo anonimo (VELA_ALLOW_ANON=1) para pruebas en LAN.
 *
 * ICE: el servidor entrega a cada cliente autenticado la lista `iceServers`
 * (STUN y, si esta configurado, TURN) en el mensaje `registered`. Asi las
 * credenciales de TURN viven solo aqui y no en el bundle del dashboard.
 *
 * Variables:
 *   PORT              puerto HTTP/WS (8080)
 *   VELA_TOKEN        token compartido que deben presentar agentes y visores
 *   VELA_ALLOW_ANON   "1" para aceptar registros sin token (solo desarrollo)
 *   VELA_STUN_URL     STUN (stun:stun.l.google.com:19302). Varios: separar por coma
 *   VELA_TURN_URL     TURN, p. ej. turn:turn.midominio.com:3478?transport=udp.
 *                     Varios: separar por coma. Sin esto no se entrega TURN.
 *   VELA_TURN_SECRET  secreto compartido con coturn (static-auth-secret):
 *                     genera credenciales temporales (TURN REST API)
 *   VELA_TURN_TTL     vida de esas credenciales en segundos (86400)
 *   VELA_TURN_USER    alternativa a SECRET: usuario estatico (lt-cred-mech)
 *   VELA_TURN_PASS    contrasena de ese usuario
 *   VELA_ICE_RELAY_ONLY "1" fuerza que todo pase por TURN (iceTransportPolicy)
 */

const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const TOKEN = process.env.VELA_TOKEN || '';
const ALLOW_ANON = /^(1|true|yes|on)$/i.test(process.env.VELA_ALLOW_ANON || '');

if (!TOKEN && !ALLOW_ANON) {
  console.error(
    '[signaling] falta VELA_TOKEN. Define un token compartido o, solo para pruebas en LAN, VELA_ALLOW_ANON=1.'
  );
  process.exit(1);
}
if (!TOKEN) {
  console.warn('[signaling] AVISO: modo anonimo, cualquiera que llegue al puerto puede registrarse.');
}

// -------------------------------------------------------------------------
// Auth
// -------------------------------------------------------------------------
function tokenOk(candidate) {
  if (!TOKEN) return true;
  if (typeof candidate !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(TOKEN);
  // timingSafeEqual exige misma longitud; comparar longitudes no filtra nada util.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// -------------------------------------------------------------------------
// ICE (STUN/TURN)
// -------------------------------------------------------------------------
const splitList = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const STUN_URLS = splitList(process.env.VELA_STUN_URL || 'stun:stun.l.google.com:19302');
const TURN_URLS = splitList(process.env.VELA_TURN_URL);
const TURN_SECRET = process.env.VELA_TURN_SECRET || '';
const TURN_TTL = Number(process.env.VELA_TURN_TTL) || 86400;
const TURN_USER = process.env.VELA_TURN_USER || '';
const TURN_PASS = process.env.VELA_TURN_PASS || '';
const RELAY_ONLY = /^(1|true|yes|on)$/i.test(process.env.VELA_ICE_RELAY_ONLY || '');

if (TURN_URLS.length && !TURN_SECRET && !(TURN_USER && TURN_PASS)) {
  console.warn('[signaling] VELA_TURN_URL definido sin VELA_TURN_SECRET ni USER/PASS: se entregara TURN sin credenciales.');
}

/**
 * Credenciales temporales segun la "TURN REST API" que implementa coturn
 * (use-auth-secret + static-auth-secret): username = "<expiry>:<id>",
 * password = base64(HMAC-SHA1(secret, username)).
 */
function turnCredentials(clientId) {
  if (TURN_SECRET) {
    const expiry = Math.floor(Date.now() / 1000) + TURN_TTL;
    const username = `${expiry}:vela-${clientId}`;
    const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64');
    return { username, credential };
  }
  if (TURN_USER && TURN_PASS) return { username: TURN_USER, credential: TURN_PASS };
  return null;
}

function iceConfigFor(clientId) {
  const iceServers = [];
  if (STUN_URLS.length) iceServers.push({ urls: STUN_URLS });
  if (TURN_URLS.length) {
    const creds = turnCredentials(clientId);
    iceServers.push(creds ? { urls: TURN_URLS, ...creds } : { urls: TURN_URLS });
  }
  const cfg = { iceServers };
  if (RELAY_ONLY && TURN_URLS.length) cfg.iceTransportPolicy = 'relay';
  return cfg;
}

// -------------------------------------------------------------------------
// HTTP (solo /health) + WS
// -------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        auth: TOKEN ? 'token' : 'anon',
        turn: TURN_URLS.length > 0,
        agents: agentList().length,
        viewers: [...clients.values()].filter((c) => c.role === 'viewer').length,
      })
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, maxPayload: 256 * 1024 });

/** @type {Map<string, {id:string, ws:import('ws').WebSocket, role:'agent'|'viewer'|null, name:string|null}>} */
const clients = new Map();
let nextId = 1;

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function agentList() {
  return [...clients.values()]
    .filter((c) => c.role === 'agent')
    .map((c) => ({ id: c.id, name: c.name }));
}

function broadcastAgentsToViewers() {
  const agents = agentList();
  for (const c of clients.values()) {
    if (c.role === 'viewer') send(c.ws, { type: 'agents', agents });
  }
}

// Un socket que no se registra en este plazo se cierra: no acumulamos
// conexiones anonimas abiertas.
const REGISTER_TIMEOUT_MS = 10_000;

wss.on('connection', (ws, req) => {
  const id = String(nextId++);
  const self = { id, ws, role: null, name: null };
  clients.set(id, self);
  send(ws, { type: 'welcome', id });

  const registerTimer = setTimeout(() => {
    if (!self.role) ws.close(4408, 'register timeout');
  }, REGISTER_TIMEOUT_MS);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    // Antes de registrarse solo se acepta `register`.
    if (!self.role) {
      if (msg.type !== 'register') return;
      if (!tokenOk(msg.token)) {
        console.warn(`[signaling] registro rechazado (${req.socket.remoteAddress}): token invalido`);
        send(ws, { type: 'error', code: 'unauthorized', message: 'token invalido' });
        ws.close(4401, 'unauthorized');
        return;
      }
      clearTimeout(registerTimer);
      self.role = msg.role === 'agent' ? 'agent' : 'viewer';
      self.name = (msg.name && String(msg.name).slice(0, 64)) || `PC-${id}`;
      send(ws, { type: 'registered', id, role: self.role, ...iceConfigFor(id) });
      // La lista de agentes cambia solo cuando entra un agente; un visor
      // nuevo solo necesita su propia copia.
      if (self.role === 'viewer') send(ws, { type: 'agents', agents: agentList() });
      else broadcastAgentsToViewers();
      console.log(`[signaling] ${self.role} #${id} "${self.name}" registrado`);
      return;
    }

    switch (msg.type) {
      // viewer -> agent: quiero ver tu pantalla
      case 'subscribe':
      case 'unsubscribe': {
        if (self.role !== 'viewer') return;
        const agent = clients.get(String(msg.agentId));
        if (agent && agent.role === 'agent') {
          send(agent.ws, { type: msg.type, viewerId: id });
        }
        break;
      }

      // relay puro de SDP/ICE entre pares registrados. `from` lo pone el
      // servidor, nunca el cliente.
      case 'offer':
      case 'answer':
      case 'ice': {
        const target = clients.get(String(msg.to));
        if (target && target.role && target.role !== self.role) {
          send(target.ws, { ...msg, from: id });
        }
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    clearTimeout(registerTimer);
    const wasRegistered = !!self.role;
    clients.delete(id);
    if (!wasRegistered) return;
    for (const c of clients.values()) {
      if (c.role) send(c.ws, { type: 'peer-left', id });
    }
    broadcastAgentsToViewers();
  });

  ws.on('error', () => {
    try {
      ws.close();
    } catch {
      /* noop */
    }
  });
});

server.listen(PORT, () => {
  console.log(
    `[signaling] escuchando en :${PORT} · auth=${TOKEN ? 'token' : 'ANONIMO'} · turn=${TURN_URLS.length ? TURN_URLS.join(',') : 'no'}`
  );
});
