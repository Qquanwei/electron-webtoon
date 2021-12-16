import IPC from '../shared';
import fetch from './fetch';

export default class IPCOnline implements IPC {
  async takeDirectory() {
    return fetch('/take-directory');
  }

  async addComicToLibrary(path) {
    return fetch.post('/comic', {
      path,
    });
  }

  async fetchComicList() {
    return fetch(`/comic`, {
      method: 'GET',
    });
  }

  async fetchComic(id) {
    return fetch(`/comic/${id}`);
  }

  async fetchImgList(id) {
    return fetch(`/comic/${id}/imglist`);
  }
}
