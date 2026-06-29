import { ipcRenderer } from "../shared-electron/electron-runtime";
import {
  createIpcClient,
  IPC_EVENT,
  IPC_RPC,
  type AppEvent,
  type AppEventPayload,
  type AppEventType,
  type RpcAction,
  type RpcPayloadMap,
} from "../shared/ipc/client";

const eventListeners = new Map<
  AppEventType,
  Set<(payload: AppEventPayload<AppEventType>) => void>
>();

ipcRenderer.on(IPC_EVENT, (_event, appEvent: AppEvent) => {
  const listeners = eventListeners.get(appEvent.type);
  if (!listeners) return;
  listeners.forEach((handler) => {
    handler(appEvent.payload as AppEventPayload<typeof appEvent.type>);
  });
});

function invokeRpc<A extends RpcAction>(
  action: A,
  payload: RpcPayloadMap[A],
): Promise<unknown> {
  return ipcRenderer.invoke(IPC_RPC, { action, payload });
}

function subscribeEvent<T extends AppEventType>(
  type: T,
  handler: (payload: AppEventPayload<T>) => void,
): () => void {
  if (!eventListeners.has(type)) {
    eventListeners.set(type, new Set());
  }
  const listeners = eventListeners.get(type)!;
  listeners.add(handler as (payload: AppEventPayload<AppEventType>) => void);

  return () => {
    listeners.delete(handler as (payload: AppEventPayload<AppEventType>) => void);
  };
}

export const ipc = createIpcClient(invokeRpc, subscribeEvent);

export const getIPC = async () => ipc;
