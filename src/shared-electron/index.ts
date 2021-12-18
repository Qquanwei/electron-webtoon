import { ipcRenderer } from 'electron';
import { IPC } from '../shared';

export default class ElectronIPC implements IPC {
  takeDirectory() {
    return ipcRenderer.invoke('/take-directory');
  }

  addComicToLibrary(path: string) {
    return ipcRenderer.invoke('/post/comic', path);
  }

  fetchComicList() {
    return ipcRenderer.invoke('/comic');
  }

  fetchComic(id: string) {
    return ipcRenderer.invoke(`/comic`, id);
  }

  fetchImgList(id: string) {
    return ipcRenderer.invoke(`/comic/imglist`, id);
  }

  removeComic(id: string) {
    return ipcRenderer.invoke(`/delete/comic`, id);
  }

  saveComicTag(id: string, tag: string) {
    return ipcRenderer.invoke('/put/bookmark', id, tag);
  }
}
