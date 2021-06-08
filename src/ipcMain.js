import electron from 'electron';

export default function init(app, mainWindow) {
  electron.ipcMain.handle('selectDirectory', async () => {
    return electron.dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
  });
}
