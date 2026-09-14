'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Puente de la ventana de estado: lee el estado, se suscribe a cambios y pide
// al proceso principal las acciones (permisos, ocultar, configuracion, salir).
contextBridge.exposeInMainWorld('statusAPI', {
  get: () => ipcRenderer.invoke('status-get'),
  onState: (cb) => {
    const handler = (_e, state) => cb(state);
    ipcRenderer.on('state', handler);
    return () => ipcRenderer.removeListener('state', handler);
  },
  requestPermission: (kind) => ipcRenderer.send('status-permission', kind),
  resetPermissions: () => ipcRenderer.send('status-reset-permissions'),
  openPane: (kind) => ipcRenderer.send('status-open-pane', kind),
  saveConfig: (input) => ipcRenderer.invoke('status-save-config', input),
  hide: () => ipcRenderer.send('status-hide'),
  openConfig: () => ipcRenderer.send('status-open-config'),
  quit: () => ipcRenderer.send('status-quit'),
});
