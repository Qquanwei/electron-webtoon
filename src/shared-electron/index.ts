import { ipcRenderer } from 'electron';
import { IPC } from '../shared';

export default class ElectronIPC implements IPC {
  getConfig() {
    return ipcRenderer.invoke('getConfig');
  }

  takeDirectory() {
    return ipcRenderer.invoke('selectDirectory');
  }

  fetchComicList() {
    return ipcRenderer.invoke('/comic');
  }

  fetchComic(id: string) {
    return ipcRenderer.invoke(`/comic/${id}`);
  }

  addComicToLibrary(path: string) {
    return ipcRenderer.invoke('/post/comic', path);
  }

  fetchImgList(id: string) {
    return ipcRenderer.invoke(`/comic/${id}/imglist`);
  }

  removeComic(id: string) {
    return ipcRenderer.invoke(`/delete/comic/${id}`);
  }

  saveComicTag(id: string, tag: string) {
    return fetch(`/post/bookmark`, {
      tag,
      id,
    });
  }
}
