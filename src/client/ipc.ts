import isElectron from "is-electron";
import { IPC } from "../shared/type";
import { once } from "./utils";

/*
   如果在web端打开，则使用httpcontroller
 */
export const getIPC: () => Promise<IPC> = once(() =>
  (() => {
    /**
     * FIXME: 在线模式现在不可用
     */
    if (!isElectron()) {
      return import("../shared-online").then((pkg) => {
        return pkg.default as IPC;
      });
    }
    return import("../shared-electron").then((pkg) => {
      return pkg.default as IPC;
    });
  })().then((ControllerCtor: IPC) => {
    return new ControllerCtor() as IPC;
  }),
);

/**
 * @deprecated 请使用getIPC替代，该方法会下线
 */
export default getIPC();
