import electron from 'electron';
import os from 'os';
import Log from 'electron-log';
import network from 'network';
import ComicService from './comicsservice';
import hostServer from './localserver';

export default function init(app, mainWindow) {
  const service = new ComicService(mainWindow);

  const { ipcMain } = electron;
  let server = null;
  ipcMain.handle('/comic', (event, id) => {
    if (id) {
      return service.getComic(id);
    }
    return service.getComicList();
  });

  ipcMain.handle('/post/comic', (event, path) => {
    return service.addComicToLibrary(path);
  });

  ipcMain.handle('/delete/comic', (event, id) => {
    return service.removeComic(id);
  });

  ipcMain.handle('/put/bookmark', (event, id, tag, position) => {
    return service.saveComicTag(id, {tag, position});
  });

  ipcMain.handle('/comic/imglist', async (event, id) => {
    return service.getComicImgList(id);
  });

  ipcMain.handle('/take-directory', () => {
    return service.takeDirectory();
  });

  ipcMain.handle('/startlocalserver', async () => {
    // need validate
    const address = await new Promise((resolve, reject) => {
      network.get_private_ip(function (error, ip) {
        if (error) {
          reject(error);
        } else {
          resolve(ip);
        }
      });
    });

    if (!server) {
      server = await hostServer(mainWindow, address);
    }
    return {
      address,
      port: server.address().port,
    };
  });

  ipcMain.handle('/take-compress-and-add-to-comic', async () => {
    await service.takeCompressAndAddToComic();
  });

  ipcMain.handle('/log', async ({ type, txt }) => {
    if (Log[type]) {
      Log[type](txt);
    } else {
      console.error('unknown log type:', type, txt);
    }
  });
}
