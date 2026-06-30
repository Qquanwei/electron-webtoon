import type { BrowserWindow } from "electron";
import { IPC_EVENT, type AppEvent } from "./contract";

export function emitAppEvent(window: BrowserWindow, event: AppEvent): void {
  window.webContents.send(IPC_EVENT, event);
}
