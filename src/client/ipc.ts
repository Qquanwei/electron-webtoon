import { once } from "./utils";
import { EmptyFunction, IPC } from "@shared/type";
import ElectronIPC from "../shared-electron";

/*
   如果在web端打开，则使用http ipc
 */
export const getIPC: EmptyFunction<Promise<IPC>> = once(() =>
  Promise.resolve(new ElectronIPC()),
);
