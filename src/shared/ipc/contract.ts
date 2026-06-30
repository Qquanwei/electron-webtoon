import type { IComic, IDecompressProgress, IImgList, Path } from "../type";

export const IPC_RPC = "webtoon:rpc";
export const IPC_EVENT = "webtoon:events";

export type RpcAction =
  | "config:get"
  | "config:set"
  | "config:reset"
  | "comic:list"
  | "comic:get"
  | "comic:imgList"
  | "comic:add"
  | "comic:remove"
  | "comic:archive"
  | "comic:saveBookmark"
  | "comic:setProperty"
  | "comic:drop"
  | "comic:takeCompress"
  | "dialog:directory"
  | "server:startLocal"
  | "log";

export type RpcPayloadMap = {
  "config:get": { key: string };
  "config:set": { key: string; value: unknown };
  "config:reset": { key: string };
  "comic:list": undefined;
  "comic:get": { id: string };
  "comic:imgList": { id: string };
  "comic:add": { path: string };
  "comic:remove": { id: string };
  "comic:archive": { id: string };
  "comic:saveBookmark": { id: string; tag: string; position: string | number };
  "comic:setProperty": { id: string; property: string; value: string };
  "comic:drop": { paths: string[] };
  "comic:takeCompress": undefined;
  "dialog:directory": undefined;
  "server:startLocal": undefined;
  log: { type?: string; txt: string };
};

export type RpcRequest<A extends RpcAction = RpcAction> = {
  action: A;
  payload: RpcPayloadMap[A];
};

export type AppEvent =
  | { type: "msg"; payload: string }
  | { type: "decompress"; payload: string }
  | { type: "decompress-progress"; payload: IDecompressProgress }
  | { type: "decompress-done"; payload: { pathname: string } };

export type AppEventType = AppEvent["type"];

export type AppEventPayload<T extends AppEventType> = Extract<
  AppEvent,
  { type: T }
>["payload"];

/** Renderer-facing API shape (Electron + optional HTTP adapter). */
export interface IpcClient {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<unknown>;
  reset(key: string): Promise<unknown>;
  fetchComicList(): Promise<IComic[]>;
  fetchComic(id: string): Promise<IComic>;
  fetchImgList(id: string): Promise<IImgList>;
  addComicToLibrary(path: string): Promise<unknown>;
  removeComic(id: string): Promise<unknown>;
  archiveComic(id: string): Promise<unknown>;
  saveComicTag(
    id: string,
    tag: string,
    position: string | number,
  ): Promise<unknown>;
  setComicProperty(
    id: string,
    property: string,
    value: string,
  ): Promise<unknown>;
  handleDroppedFiles(paths: string[]): Promise<unknown>;
  takeCompressAndAddToComic(): Promise<void>;
  takeDirectory(): Promise<Path>;
  startLocalServer(): Promise<{ address: string; port: number }>;
  addLog(type: string, txt: string): Promise<void>;
  onEvent<T extends AppEventType>(
    type: T,
    handler: (payload: AppEventPayload<T>) => void,
  ): () => void;
}
