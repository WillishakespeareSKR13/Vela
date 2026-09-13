'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Puente minimo: el renderer (WebRTC) manda eventos de entrada al proceso
// principal, que es quien tiene acceso a nut-js para inyectarlos en el SO.
contextBridge.exposeInMainWorld('agentAPI', {
  applyInput: (ev) => ipcRenderer.send('agent-input', ev),
  setControlIndicator: (active) => ipcRenderer.send('agent-control-indicator', active),
  // Estado del canal (conectando / en linea / sin conexion / token rechazado)
  // y numero de visores, para la ventana de estado y el tooltip del tray.
  reportStatus: (patch) => ipcRenderer.send('agent-status', patch),
});
