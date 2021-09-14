import electron from 'electron';
import config from './config.json';

export default function init(app, mainWindow) {
  // 打开文件选择对话框
  electron.ipcMain.handle('selectDirectory', async () => {
    return electron.dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
  });

  // 获取配置
  electron.ipcMain.handle('getConfig', async () => {
    return config;
  });
}
