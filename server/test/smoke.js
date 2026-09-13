'use strict';

/**
 * Prueba de humo del servidor de senalizacion, sin WebRTC.
 * Arranca el servidor en un puerto libre con token y TURN configurados y
 * comprueba: rechazo sin token, registro de agente y visor, entrega de
 * iceServers con credenciales TURN temporales, relay subscribe/offer/answer/
 * ice con `from` puesto por el servidor, y peer-left al desconectar.
 *
 *   npm test
 */

const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = 18080 + Math.floor(Math.random() * 1000);
const TOKEN = 'test-token-' + crypto.randomBytes(4).toString('hex');
const TURN_SECRET = 'turn-secret';

let failed = 0;
function check(cond, label) {
  console.log(`${cond ? '  ok ' : ' FAIL'} ${label}`);
  if (!cond) failed++;
}

function open(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const inbox = [];
    const waiters = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      const i = waiters.findIndex((w) => w.pred(msg));
      if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
      else inbox.push(msg);
    });
    ws.on('open', () => resolve({ ws, next, closed: new Promise((r) => ws.on('close', r)) }));
    ws.on('error', reject);

    function next(pred, ms = 2000) {
      const i = inbox.findIndex(pred);
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const w = { pred, resolve };
        waiters.push(w);
        setTimeout(() => {
          const k = waiters.indexOf(w);
          if (k >= 0) {
            waiters.splice(k, 1);
            reject(new Error('timeout esperando mensaje'));
          }
        }, ms);
      });
    }
  });
}

const sendJ = (c, o) => c.ws.send(JSON.stringify(o));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      VELA_TOKEN: TOKEN,
      VELA_TURN_URL: 'turn:turn.example.test:3478?transport=udp',
      VELA_TURN_SECRET: TURN_SECRET,
      VELA_TURN_TTL: '600',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve) => server.stdout.on('data', (d) => /escuchando/.test(d) && resolve()));
  const url = `ws://127.0.0.1:${PORT}`;

  try {
    // 1) sin token -> error + cierre 4401
    const anon = await open(url);
    await anon.next((m) => m.type === 'welcome');
    sendJ(anon, { type: 'register', role: 'agent', name: 'intruso' });
    const err = await anon.next((m) => m.type === 'error');
    check(err.code === 'unauthorized', 'registro sin token: error unauthorized');
    const code = await anon.closed;
    check(code === 4401, `cierre con codigo 4401 (recibido ${code})`);

    // 2) token incorrecto (misma longitud) tambien se rechaza
    const bad = await open(url);
    sendJ(bad, { type: 'register', role: 'agent', name: 'x', token: TOKEN.slice(0, -1) + '!' });
    check((await bad.closed) === 4401, 'token incorrecto rechazado');

    // 3) mensajes antes de registrar se ignoran (no revienta, no releva)
    const agent = await open(url);
    const welcome = await agent.next((m) => m.type === 'welcome');
    sendJ(agent, { type: 'offer', to: '1', sdp: 'x' });
    sendJ(agent, { type: 'register', role: 'agent', name: 'Recepcion-01', token: TOKEN });
    const reg = await agent.next((m) => m.type === 'registered');
    check(reg.id === welcome.id && reg.role === 'agent', 'agente registrado con su id');

    // 4) iceServers con STUN + TURN con credenciales HMAC validas
    const turn = reg.iceServers.find((s) => String(s.urls).startsWith('turn:'));
    check(reg.iceServers.some((s) => String(s.urls).startsWith('stun:')), 'iceServers incluye STUN');
    check(!!turn && !!turn.username && !!turn.credential, 'iceServers incluye TURN con credenciales');
    if (turn) {
      const [expiry, user] = turn.username.split(':');
      const expected = crypto.createHmac('sha1', TURN_SECRET).update(turn.username).digest('base64');
      check(turn.credential === expected, 'credencial TURN = HMAC-SHA1(secret, username)');
      check(Number(expiry) > Date.now() / 1000 + 500 && user === `vela-${reg.id}`, 'username TURN = expiry:vela-<id>');
    }

    // 5) visor: registro, lista de agentes, subscribe -> el agente recibe viewerId
    const viewer = await open(url);
    sendJ(viewer, { type: 'register', role: 'viewer', name: 'Dashboard', token: TOKEN });
    const vreg = await viewer.next((m) => m.type === 'registered');
    const agents = await viewer.next((m) => m.type === 'agents');
    check(agents.agents.some((a) => a.id === reg.id && a.name === 'Recepcion-01'), 'visor recibe lista de agentes');

    sendJ(viewer, { type: 'subscribe', agentId: reg.id });
    const sub = await agent.next((m) => m.type === 'subscribe');
    check(sub.viewerId === vreg.id, 'agente recibe subscribe con viewerId');

    // 6) relay offer/answer/ice; `from` lo pone el servidor aunque el cliente mienta
    sendJ(agent, { type: 'offer', to: vreg.id, sdp: 'SDP-OFFER', from: 'falso' });
    const offer = await viewer.next((m) => m.type === 'offer');
    check(offer.sdp === 'SDP-OFFER' && offer.from === reg.id, 'offer relevado con from del servidor');

    sendJ(viewer, { type: 'answer', to: reg.id, sdp: 'SDP-ANSWER' });
    const answer = await agent.next((m) => m.type === 'answer');
    check(answer.sdp === 'SDP-ANSWER' && answer.from === vreg.id, 'answer relevado');

    sendJ(viewer, { type: 'ice', to: reg.id, candidate: { candidate: 'c' } });
    const ice = await agent.next((m) => m.type === 'ice');
    check(ice.candidate.candidate === 'c', 'ice relevado');

    // 7) un agente no puede "subscribe" (solo visores)
    sendJ(agent, { type: 'subscribe', agentId: reg.id });
    let leaked = false;
    await agent.next((m) => m.type === 'subscribe', 300).then(() => (leaked = true), () => {});
    check(!leaked, 'subscribe desde un agente se ignora');

    // 8) al irse el agente, el visor recibe peer-left y lista vacia
    agent.ws.close();
    const left = await viewer.next((m) => m.type === 'peer-left');
    const empty = await viewer.next((m) => m.type === 'agents');
    check(left.id === reg.id && empty.agents.length === 0, 'peer-left y lista actualizada');

    // 9) /health
    const health = await fetch(`http://127.0.0.1:${PORT}/health`).then((r) => r.json());
    check(health.ok && health.auth === 'token' && health.turn === true, '/health reporta auth=token, turn=true');

    viewer.ws.close();
    bad.ws.close();
    await sleep(50);
  } finally {
    server.kill();
  }

  console.log(failed ? `\n${failed} comprobaciones fallaron` : '\ntodo ok');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
