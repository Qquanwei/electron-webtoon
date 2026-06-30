import type {
  AppEventPayload,
  AppEventType,
  IpcClient,
} from "../shared/ipc/contract";
import fetch from "./fetch";

export default class IPCOnline implements IpcClient {
  onEvent<T extends AppEventType>(
    _type: T,
    _handler: (payload: AppEventPayload<T>) => void,
  ) {
    return () => {};
  }

  get(key: string) {
    return fetch("/get", { key });
  }

  set(key: string, value: unknown) {
    return fetch("/set", { key, value });
  }

  reset(key: string) {
    return fetch("/reset", { key });
  }

  async takeDirectory() {
    return fetch("/take-directory");
  }

  async addComicToLibrary(path: string) {
    return fetch.post("/comic", { path });
  }

  async fetchComicList() {
    return fetch(`/comic`);
  }

  async fetchComic(id: string) {
    return fetch(`/comic/${id}`);
  }

  async fetchImgList(id: string) {
    return fetch(`/comic/${id}/imglist`);
  }

  async removeComic(id: string) {
    return fetch.delete(`/comic/${id}`);
  }

  async archiveComic(_id: string) {
    return undefined;
  }

  async saveComicTag(id: string, tag: string, position: string | number) {
    return fetch.put("/bookmark", { id, tag, position });
  }

  async setComicProperty(_id: string, _property: string, _value: string) {
    return undefined;
  }

  async handleDroppedFiles(_paths: string[]) {
    return undefined;
  }

  takeCompressAndAddToComic() {
    return Promise.resolve();
  }

  startLocalServer() {
    return Promise.resolve({ address: "", port: 0 });
  }

  async addLog() {
    // online log ignored
  }
}
