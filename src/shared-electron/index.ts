import { ipcRenderer } from 'electron';
import { IPC } from '../shared';

export default class ElectronIPC implements IPC {
  onCompressFile(callback) {
    ipcRenderer.on('decompress', (_, data) => callback(data));
  }

  onCompressDone(callback) {
    ipcRenderer.on('decompress-done', (_, data) => callback(data));
  }

  onMsg(callback) {
    ipcRenderer.on('msg', (_, msg) => callback(msg));
  }

  takeDirectory() {
    return ipcRenderer.invoke('/take-directory');
  }

  takeCompressAndAddToComic() {
    return ipcRenderer.invoke('/take-compress-and-add-to-comic');
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

  saveComicTag(id: string, tag: string, position: number) {
    return ipcRenderer.invoke('/put/bookmark', id, tag, position);
  }

  startLocalServer() {
    return ipcRenderer.invoke('/startlocalserver');
  }

  addLog(type = 'info', txt) {
    return ipcRenderer.invoke('/log', {
      type,
      txt,
    });
  }
}
