import IPC from '../shared';
import fetch from './fetch';

export default class IPCOnline implements IPC {
  getConfig() {
    return fetch('/api/config');
  }

  takeDirectory() {
    // noting was happened
  }
}
