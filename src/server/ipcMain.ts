import type { App } from "electron";
import type { BrowserWindow } from "electron";
import ComicService from "./comicsservice";
import registerIpc from "./ipc/register";

export default function initIpc(_app: App, mainWindow: BrowserWindow): void {
  const service = new ComicService(mainWindow);
  registerIpc(service);
}
