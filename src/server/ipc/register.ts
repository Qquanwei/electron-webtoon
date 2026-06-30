import electron from "electron";
import Log from "electron-log";
import network from "network";
import ComicService from "../comicsservice";
import hostServer from "../localserver";
import {
  IPC_RPC,
  type RpcAction,
  type RpcPayloadMap,
  type RpcRequest,
} from "../../shared/ipc/contract";

type RpcHandler<A extends RpcAction> = (
  service: ComicService,
  payload: RpcPayloadMap[A],
) => Promise<unknown> | unknown;

let localServer: { address?: () => { port: number } } | null = null;

const rpcHandlers: { [K in RpcAction]: RpcHandler<K> } = {
  "config:get": (service, { key }) => service.get(key),
  "config:set": (service, { key, value }) => service.set(key, value),
  "config:reset": (service, { key }) => service.reset(key),
  "comic:list": (service) => service.getComicList(),
  "comic:get": (service, { id }) => service.getComic(id),
  "comic:imgList": (service, { id }) => service.getComicImgList(id),
  "comic:add": (service, { path }) => service.addComicToLibrary(path),
  "comic:remove": (service, { id }) => service.removeComic(id),
  "comic:archive": (service, { id }) => service.archiveComic(id),
  "comic:saveBookmark": (service, { id, tag, position }) =>
    service.saveComicTag(id, { tag, position }),
  "comic:setProperty": (service, { id, property, value }) =>
    service.setComicProperty(id, property, value),
  "comic:drop": (service, { paths }) => service.handleDroppedFiles(paths),
  "comic:takeCompress": (service) => service.takeCompressAndAddToComic(),
  "dialog:directory": (service) => service.takeDirectory(),
  "server:startLocal": async (service) => {
    const address = await new Promise<string>((resolve, reject) => {
      network.get_private_ip((error, ip) => {
        if (error) reject(error);
        else resolve(ip);
      });
    });

    if (!localServer) {
      localServer = await hostServer(service.mainWindow, address);
    }

    return {
      address,
      port: localServer?.address?.().port,
    };
  },
  log: (_service, { type = "info", txt }) => {
    const logger = Log[type as keyof typeof Log];
    if (typeof logger === "function") {
      (logger as (message: string) => void)(txt);
    } else {
      console.error("unknown log type:", type, txt);
    }
  },
};

function dispatchRpc(service: ComicService, request: RpcRequest) {
  const handler = rpcHandlers[request.action];
  return handler(service, request.payload as RpcPayloadMap[typeof request.action]);
}

export default function registerIpc(service: ComicService): void {
  electron.ipcMain.handle(IPC_RPC, (_event, request: RpcRequest) =>
    dispatchRpc(service, request),
  );
}
