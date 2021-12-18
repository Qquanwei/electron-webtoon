import electron from 'electron';
import ComicService from './comicsservice';

export default function init(app, mainWindow) {
  const service = new ComicService(mainWindow);

  const { ipcMain } = electron;
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

  ipcMain.handle('/put/bookmark', (event, id, tag) => {
    return service.saveComicTag(id, tag);
  });

  ipcMain.handle('/comic/imglist', async (event, id) => {
    return service.getComicImgList(id);
  });

  ipcMain.handle('/take-directory', () => {
    return service.takeDirectory();
  });
}
