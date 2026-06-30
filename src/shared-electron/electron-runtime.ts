type ElectronModule = typeof import("electron");

function loadElectron(): ElectronModule {
  const nodeRequire =
    typeof globalThis.require === "function"
      ? globalThis.require
      : undefined;

  if (!nodeRequire) {
    throw new Error("Electron runtime is not available");
  }

  return nodeRequire("electron") as ElectronModule;
}

const electron = loadElectron();

export const { ipcRenderer, webUtils } = electron;
export default electron;
