import {
  IPC_EVENT,
  IPC_RPC,
  type AppEvent,
  type AppEventPayload,
  type AppEventType,
  type IpcClient,
  type RpcAction,
  type RpcPayloadMap,
} from "./contract";

type RpcInvoker = <A extends RpcAction>(
  action: A,
  payload: RpcPayloadMap[A],
) => Promise<unknown>;

type EventSubscriber = <T extends AppEventType>(
  type: T,
  handler: (payload: AppEventPayload<T>) => void,
) => () => void;

export function createIpcClient(
  invoke: RpcInvoker,
  subscribe: EventSubscriber,
): IpcClient {
  return {
    get: (key) => invoke("config:get", { key }),
    set: (key, value) => invoke("config:set", { key, value }),
    reset: (key) => invoke("config:reset", { key }),
    fetchComicList: () => invoke("comic:list", undefined) as Promise<any>,
    fetchComic: (id) => invoke("comic:get", { id }) as Promise<any>,
    fetchImgList: (id) => invoke("comic:imgList", { id }) as Promise<any>,
    addComicToLibrary: (path) => invoke("comic:add", { path }),
    removeComic: (id) => invoke("comic:remove", { id }),
    archiveComic: (id) => invoke("comic:archive", { id }),
    saveComicTag: (id, tag, position) =>
      invoke("comic:saveBookmark", { id, tag, position }),
    setComicProperty: (id, property, value) =>
      invoke("comic:setProperty", { id, property, value }),
    handleDroppedFiles: (paths) => invoke("comic:drop", { paths }),
    takeCompressAndAddToComic: () =>
      invoke("comic:takeCompress", undefined) as Promise<void>,
    takeDirectory: () =>
      invoke("dialog:directory", undefined) as Promise<any>,
    startLocalServer: () =>
      invoke("server:startLocal", undefined) as Promise<any>,
    addLog: (type, txt) => invoke("log", { type, txt }) as Promise<void>,
    onEvent: subscribe,
  };
}

export { IPC_RPC, IPC_EVENT, type AppEvent };
