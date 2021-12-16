import electron from 'electron';

export default function init(app, mainWindow) {
  // 获取配置
  electron.ipcMain.handle('getConfig', async () => {
    /* eslint-disable-next-line */
    return require('./config.json');
  });

  electron.ipcMain.handle('/comic', async () => {});
}
