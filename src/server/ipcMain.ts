import electron from "electron";
import Log from "electron-log";
import network from "network";
import ComicService from "./comicsservice";
import hostServer from "./localserver";

export default function init(_app, mainWindow: Electron.BrowserWindow) {
  const service = new ComicService(mainWindow);

  const { ipcMain } = electron;
  let server = null;
  ipcMain.handle("/comic", (event, id?: string) => {
    if (id) {
      return service.getComic(id);
    }
    return service.getComicList();
  });

  ipcMain.handle("/get", (event, key) => {
    return service.get(key);
  });

  ipcMain.handle("/set", (event, key, value) => {
    return service.set(key, value);
  });

  ipcMain.handle("/post/comic", (event, path) => {
    return service.addComicToLibrary(path);
  });

  ipcMain.handle("/delete/comic", (event, id) => {
    return service.removeComic(id);
  });

  ipcMain.handle("/put/bookmark", (event, id, tag, position) => {
    return service.saveComicTag(id, { tag, position });
  });

  ipcMain.handle("/comic/imglist", async (event, id) => {
    return service.getComicImgList(id);
  });

  ipcMain.handle("/take-directory", () => {
    return service.takeDirectory();
  });

  ipcMain.handle(
    "/put/comic/property",
    (event, id: string, property: string, value: string) => {
      return service.setComicProperty(id, property, value);
    },
  );

  ipcMain.handle("/startlocalserver", async () => {
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
      port: server?.address?.().port,
    };
  });

  ipcMain.handle("/take-compress-and-add-to-comic", async () => {
    await service.takeCompressAndAddToComic();
  });

  ipcMain.handle("/log", async ({ type, txt }) => {
    if (Log[type]) {
      Log[type](txt);
    } else {
      console.error("unknown log type:", type, txt);
    }
  });
}
