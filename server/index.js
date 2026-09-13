'use strict';

/**
 * Servidor de senalizacion WebRTC.
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
 */

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: clients.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

/** @type {Map<string, {id:string, ws:import('ws').WebSocket, role:string|null, name:string|null}>} */
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

wss.on('connection', (ws) => {
  const id = String(nextId++);
  const self = { id, ws, role: null, name: null };
  clients.set(id, self);
  send(ws, { type: 'welcome', id });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'register': {
        self.role = msg.role === 'agent' ? 'agent' : 'viewer';
        self.name = (msg.name && String(msg.name).slice(0, 64)) || `PC-${id}`;
        if (self.role === 'viewer') {
          send(ws, { type: 'agents', agents: agentList() });
        }
        broadcastAgentsToViewers();
        break;
      }

      // viewer -> agent: quiero ver tu pantalla
      case 'subscribe': {
        const agent = clients.get(msg.agentId);
        if (agent && agent.role === 'agent') {
          send(agent.ws, { type: 'subscribe', viewerId: id });
        }
        break;
      }

      case 'unsubscribe': {
        const agent = clients.get(msg.agentId);
        if (agent && agent.role === 'agent') {
          send(agent.ws, { type: 'unsubscribe', viewerId: id });
        }
        break;
      }

      // relay puro de SDP/ICE entre pares identificados por id
      case 'offer':
      case 'answer':
      case 'ice': {
        const target = clients.get(msg.to);
        if (target) send(target.ws, { ...msg, from: id });
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    for (const c of clients.values()) {
      send(c.ws, { type: 'peer-left', id });
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
  console.log(`[signaling] escuchando en :${PORT}`);
});
