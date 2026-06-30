import { useCallback, useState } from "react";
import KeyboardOutlinedIcon from "@mui/icons-material/KeyboardOutlined";
import {
  findDuplicateShortcut,
  formatShortcutKey,
  normalizeShortcutKey,
  SHORTCUT_ACTION_LABELS,
  type ShortcutAction,
} from "../../shared/shortcuts";
import { useShortcutBindings } from "../hooks/useShortcutBindings";
import { useMessage } from "@components/useMessage";
import {
  SettingsActions,
  SettingsSection,
  settingsBtnPrimary,
  settingsBtnSecondary,
} from "@components/settings/SettingsSection";

export default function ShortcutSettings() {
  const { bindings, setBindings, save, reset } = useShortcutBindings();
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { pushMessage } = useMessage();

  const onRecordKey = useCallback(
    (action: ShortcutAction, event: React.KeyboardEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setRecordingAction(null);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        return;
      }

      const nextKey = normalizeShortcutKey(event.key);
      if (!nextKey || nextKey === "escape") {
        return;
      }

      setBindings((current) => ({
        ...current,
        [action]: nextKey,
      }));
      setRecordingAction(null);
    },
    [setBindings],
  );

  const onSave = useCallback(async () => {
    const duplicate = findDuplicateShortcut(bindings);
    if (duplicate) {
      pushMessage(`快捷键冲突：${formatShortcutKey(duplicate)}`, 2000);
      return;
    }

    setSaving(true);
    try {
      await save(bindings);
      pushMessage("快捷键已保存", 1000);
    } catch {
      pushMessage("快捷键保存失败", 1000);
    } finally {
      setSaving(false);
    }
  }, [bindings, pushMessage, save]);

  const onReset = useCallback(async () => {
    setResetting(true);
    try {
      await reset();
      pushMessage("快捷键已恢复默认", 1000);
    } finally {
      setResetting(false);
    }
  }, [pushMessage, reset]);

  return (
    <SettingsSection
      icon={<KeyboardOutlinedIcon fontSize="small" />}
      title="阅读快捷键"
      description="仅在漫画阅读页生效，焦点在输入框时不会触发"
    >
      <div className="divide-y divide-neutral-200 overflow-hidden border border-neutral-300">
        {(Object.keys(SHORTCUT_ACTION_LABELS) as ShortcutAction[]).map(
          (action) => {
            const meta = SHORTCUT_ACTION_LABELS[action];
            const isRecording = recordingAction === action;

            return (
              <div
                key={action}
                className="flex flex-col gap-3 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-black">
                    {meta.label}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-400">
                    {meta.description}
                  </div>
                </div>

                <button
                  type="button"
                  className={`inline-flex min-w-[7rem] items-center justify-center border px-4 py-2.5 font-mono text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-black/10 ${
                    isRecording
                      ? "border-black bg-neutral-100 text-black ring-1 ring-black"
                      : "border-neutral-300 bg-neutral-50 text-neutral-800 hover:border-black hover:bg-white"
                  }`}
                  onClick={() => setRecordingAction(action)}
                  onBlur={() =>
                    setRecordingAction((current) =>
                      current === action ? null : current,
                    )
                  }
                  onKeyDown={(event) => onRecordKey(action, event)}
                >
                  {isRecording ? "按下按键…" : formatShortcutKey(bindings[action])}
                </button>
              </div>
            );
          },
        )}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-neutral-500">
        点击右侧按键区域后按下目标键即可绑定，按 Esc 取消。
      </p>

      <SettingsActions className="mt-4">
        <button
          type="button"
          className={settingsBtnSecondary}
          onClick={onReset}
          disabled={resetting}
        >
          {resetting ? "重置中…" : "恢复默认"}
        </button>
        <button
          type="button"
          className={settingsBtnPrimary}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "保存中…" : "保存快捷键"}
        </button>
      </SettingsActions>
    </SettingsSection>
  );
}
