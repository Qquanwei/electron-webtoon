import IPC from '../shared';
import fetch from './fetch';

export default class IPCOnline implements IPC {
  onCompressFile() {}

  onCompressDone() {}

  onMsg() {}

  get(key: string) {
    return fetch('/get', {
      key,
    });
  }

  set(key: string, value: any) {
    return fetch('/set', {
      key,
      value,
    });
  }

  async takeDirectory() {
    return fetch('/take-directory');
  }

  async addComicToLibrary(path) {
    return fetch.post('/comic', {
      path,
    });
  }

  async fetchComicList() {
    return fetch(`/comic`);
  }

  async fetchComic(id) {
    return fetch(`/comic/${id}`);
  }

  async fetchImgList(id) {
    return fetch(`/comic/${id}/imglist`);
  }

  async removeComic(id) {
    return fetch.delete(`/comic/${id}`);
  }

  async saveComicTag(id, tag, position) {
    return fetch.put('/bookmark', {
      id,
      tag,
      position,
    });
  }

  async addLog() {
    // online log ignored
  }
}
