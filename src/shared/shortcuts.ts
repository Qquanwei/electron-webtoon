export type ShortcutAction =
  | "scrollDown"
  | "scrollUp"
  | "nextChapter"
  | "prevChapter";

export type ShortcutBindings = Record<ShortcutAction, string>;

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindings = {
  scrollDown: "j",
  scrollUp: "k",
  nextChapter: "n",
  prevChapter: "p",
};

export const SHORTCUT_ACTION_LABELS: Record<
  ShortcutAction,
  { label: string; description: string }
> = {
  scrollDown: { label: "向下滚动", description: "默认 j" },
  scrollUp: { label: "向上滚动", description: "默认 k" },
  nextChapter: { label: "按住向下滚动", description: "默认 n，按住平滑滚动" },
  prevChapter: { label: "上一章节", description: "默认 p" },
};

export function parseShortcutBindings(raw: unknown): ShortcutBindings {
  if (!raw || typeof raw !== "string") {
    return { ...DEFAULT_SHORTCUT_BINDINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ShortcutBindings>;
    return {
      ...DEFAULT_SHORTCUT_BINDINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SHORTCUT_BINDINGS };
  }
}

export function serializeShortcutBindings(
  bindings: ShortcutBindings,
): string {
  return JSON.stringify(bindings);
}

export function normalizeShortcutKey(key: string): string {
  if (key === " ") return "space";
  if (key === "ArrowDown") return "arrowdown";
  if (key === "ArrowUp") return "arrowup";
  if (key === "ArrowLeft") return "arrowleft";
  if (key === "ArrowRight") return "arrowright";
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
}

export function formatShortcutKey(key: string): string {
  const map: Record<string, string> = {
    space: "Space",
    arrowdown: "↓",
    arrowup: "↑",
    arrowleft: "←",
    arrowright: "→",
  };
  const normalized = normalizeShortcutKey(key);
  return map[normalized] || normalized.toUpperCase();
}

export function findDuplicateShortcut(
  bindings: ShortcutBindings,
): string | null {
  const seen = new Map<string, ShortcutAction>();
  for (const [action, key] of Object.entries(bindings) as [
    ShortcutAction,
    string,
  ][]) {
    const normalized = normalizeShortcutKey(key);
    if (!normalized) continue;
    const existing = seen.get(normalized);
    if (existing) {
      return normalized;
    }
    seen.set(normalized, action);
  }
  return null;
}

export function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
