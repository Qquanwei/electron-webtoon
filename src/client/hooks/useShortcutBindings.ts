import { useCallback, useEffect, useState } from "react";
import { ipc } from "@client/ipc";
import {
  DEFAULT_SHORTCUT_BINDINGS,
  parseShortcutBindings,
  serializeShortcutBindings,
  type ShortcutBindings,
} from "../../shared/shortcuts";

export function useShortcutBindings() {
  const [bindings, setBindings] = useState<ShortcutBindings>({
    ...DEFAULT_SHORTCUT_BINDINGS,
  });

  const reload = useCallback(async () => {
    const raw = await ipc.get("shortcuts");
    setBindings(parseShortcutBindings(raw));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(async (next: ShortcutBindings) => {
    await ipc.set("shortcuts", serializeShortcutBindings(next));
    setBindings(next);
  }, []);

  const reset = useCallback(async () => {
    await ipc.reset("shortcuts");
    await reload();
  }, [reload]);

  return { bindings, setBindings, save, reset, reload };
}
