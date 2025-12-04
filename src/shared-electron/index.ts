import { ipcRenderer } from "electron";
import { IPC, UnaryFunction } from "../shared/type";

export default class ElectronIPC implements IPC {
  get(key: string) {
    return ipcRenderer.invoke("/get", key);
  }

  set(key: string, value: any) {
    return ipcRenderer.invoke("/set", key, value);
  }

  reset(key: string) {
    return ipcRenderer.invoke("/reset", key);
  }

  onCompressFile(callback: UnaryFunction<string, void>) {
    ipcRenderer.on("decompress", (_, data) => callback(data));
  }

  onCompressDone(callback: UnaryFunction<string, void>) {
    ipcRenderer.on("decompress-done", (_, data) => callback(data));
  }

  onMsg(callback: UnaryFunction<string, void>) {
    ipcRenderer.on("msg", (_, msg) => callback(msg));
  }

  takeDirectory() {
    return ipcRenderer.invoke("/take-directory");
  }

  takeCompressAndAddToComic() {
    return ipcRenderer.invoke("/take-compress-and-add-to-comic");
  }

  addComicToLibrary(path: string) {
    return ipcRenderer.invoke("/post/comic", path);
  }

  handleDroppedFiles(paths: string[]) {
    return ipcRenderer.invoke("/post/drop", paths);
  }

  fetchComicList() {
    return ipcRenderer.invoke("/comic");
  }

  fetchComic(id: string) {
    return ipcRenderer.invoke(`/comic`, id);
  }

  fetchImgList(id: string) {
    return ipcRenderer.invoke(`/comic/imglist`, id) as Promise<string[]>;
  }

  removeComic(id: string) {
    return ipcRenderer.invoke(`/delete/comic`, id);
  }

  saveComicTag(id: string, tag: string, position: number | string) {
    return ipcRenderer.invoke("/put/bookmark", id, tag, position);
  }

  setComicProperty(id: string, property: string, value: string) {
    return ipcRenderer.invoke("/put/comic/property", id, property, value);
  }

  startLocalServer() {
    return ipcRenderer.invoke("/startlocalserver");
  }

  addLog(type = "info", txt: string) {
    return ipcRenderer.invoke("/log", {
      type,
      txt,
    });
  }
}
