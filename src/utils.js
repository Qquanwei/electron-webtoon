import { ipcRenderer } from 'electron';

export function takeDirectory() {
  return ipcRenderer.invoke('selectDirectory');
}

export const unused = 1;
