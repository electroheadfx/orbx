// Pont de l'habillage des extensions (orbx://app/panel.html) : en-tête du
// panneau latéral et bandeau du débogueur. Rien d'autre ne reçoit ce pont, et
// le processus principal vérifie de son côté d'où vient chaque message
// (src/main/ext-panel.js).
const { contextBridge, ipcRenderer } = require('electron');

const CHANNEL = 'orbx-panel';

if (location.protocol === 'orbx:' && location.pathname === '/panel.html') {
  contextBridge.exposeInMainWorld('orbxPanel', {
    send: (action, data) => ipcRenderer.send(CHANNEL, String(action), data),
    on: (fn) => { ipcRenderer.on(CHANNEL, (e, data) => fn(data)); },
  });
}
