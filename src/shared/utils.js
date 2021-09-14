import { ipcRenderer } from 'electron';

export function takeDirectory() {
  return ipcRenderer.invoke('selectDirectory');
}

export function getConfig() {
  return ipcRenderer.invoke('getConfig');
}

export const unused = 1;
