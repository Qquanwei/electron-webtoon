import { useEffect } from "react";
import useComicContext from "./useComicContext";
import { useShortcutBindings } from "../../hooks/useShortcutBindings";
import {
  isEditableElement,
  normalizeShortcutKey,
  type ShortcutAction,
} from "../../../shared/shortcuts";

const SCROLL_RATIO = 0.85;

function scrollVertical(direction: "down" | "up") {
  const element = document.scrollingElement;
  if (!element) return;
  const delta = element.clientHeight * SCROLL_RATIO;
  element.scrollBy({
    top: direction === "down" ? delta : -delta,
    behavior: "smooth",
  });
}

function scrollHorizontal(direction: "forward" | "back") {
  const container = document.querySelector<HTMLElement>(
    ".comic-horizon-scroll",
  );
  if (!container) return;
  const delta = container.clientWidth * SCROLL_RATIO;
  container.scrollBy({
    left: direction === "forward" ? -delta : delta,
    behavior: "smooth",
  });
}

export default function useComicShortcuts() {
  const { comic, shortcutHandlersRef } = useComicContext();
  const { bindings } = useShortcutBindings();

  useEffect(() => {
    const actionByKey = new Map<string, ShortcutAction>();
    (Object.entries(bindings) as [ShortcutAction, string][]).forEach(
      ([action, key]) => {
        actionByKey.set(normalizeShortcutKey(key), action);
      },
    );

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableElement(event.target)) return;

      const action = actionByKey.get(normalizeShortcutKey(event.key));
      if (!action) return;

      if (action === "scrollDown" || action === "scrollUp") {
        event.preventDefault();
        if (comic?.pageMode === "horizon") {
          scrollHorizontal(action === "scrollDown" ? "forward" : "back");
        } else {
          scrollVertical(action === "scrollDown" ? "down" : "up");
        }
        return;
      }

      if (action === "nextChapter") {
        if (shortcutHandlersRef.current.nextChapter) {
          event.preventDefault();
          shortcutHandlersRef.current.nextChapter();
        }
        return;
      }

      if (action === "prevChapter") {
        if (shortcutHandlersRef.current.prevChapter) {
          event.preventDefault();
          shortcutHandlersRef.current.prevChapter();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings, comic?.pageMode, shortcutHandlersRef]);
}
