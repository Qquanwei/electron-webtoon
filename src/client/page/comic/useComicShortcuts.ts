import { useEffect, type MutableRefObject } from "react";
import useComicContext from "./useComicContext";
import type { ComicShortcutHandlers } from "./useComicContext";
import { useShortcutBindings } from "../../hooks/useShortcutBindings";
import {
  isEditableElement,
  normalizeShortcutKey,
  type ShortcutAction,
} from "../../../shared/shortcuts";

const SCROLL_RATIO = 0.85;
const HOLD_SCROLL_SPEED = 14;
const HORIZON_HOLD_TURN_MS = 680;

type HoldScrollDirection = "down" | "up" | "forward" | "back";

function scrollVertical(direction: "down" | "up") {
  const element = document.scrollingElement;
  if (!element) return;
  const delta = element.clientHeight * SCROLL_RATIO;
  element.scrollBy({
    top: direction === "down" ? delta : -delta,
    behavior: "smooth",
  });
}

function createHoldScroller(
  horizon: boolean,
  handlersRef: MutableRefObject<ComicShortcutHandlers>,
) {
  let frameId: number | null = null;
  let direction: HoldScrollDirection | null = null;
  let horizonTimer: ReturnType<typeof setInterval> | null = null;

  function stop() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    if (horizonTimer !== null) {
      clearInterval(horizonTimer);
      horizonTimer = null;
    }
    direction = null;
  }

  function start(nextDirection: HoldScrollDirection) {
    if (direction === nextDirection) {
      return;
    }
    stop();
    direction = nextDirection;

    if (horizon) {
      const pageDirection =
        nextDirection === "forward" ? "forward" : "back";
      handlersRef.current.turnHorizonPage?.(pageDirection);
      horizonTimer = setInterval(() => {
        handlersRef.current.turnHorizonPage?.(pageDirection);
      }, HORIZON_HOLD_TURN_MS);
      return;
    }

    const tick = () => {
      const element = document.scrollingElement;
      if (!element || direction !== nextDirection) {
        return;
      }

      element.scrollTop +=
        nextDirection === "down" ? HOLD_SCROLL_SPEED : -HOLD_SCROLL_SPEED;

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
  }

  return { start, stop };
}

export default function useComicShortcuts() {
  const { comic, shortcutHandlersRef } = useComicContext();
  const { bindings } = useShortcutBindings();
  const horizon = comic?.pageMode === "horizon";

  useEffect(() => {
    const actionByKey = new Map<string, ShortcutAction>();
    (Object.entries(bindings) as [ShortcutAction, string][]).forEach(
      ([action, key]) => {
        actionByKey.set(normalizeShortcutKey(key), action);
      },
    );

    const holdScroll = createHoldScroller(horizon, shortcutHandlersRef);

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableElement(event.target)) return;

      const action = actionByKey.get(normalizeShortcutKey(event.key));
      if (!action) return;

      if (action === "scrollDown" || action === "scrollUp") {
        event.preventDefault();
        if (horizon) {
          shortcutHandlersRef.current.turnHorizonPage?.(
            action === "scrollDown" ? "forward" : "back",
          );
        } else {
          scrollVertical(action === "scrollDown" ? "down" : "up");
        }
        return;
      }

      if (action === "nextChapter") {
        event.preventDefault();
        holdScroll.start(horizon ? "forward" : "down");
        return;
      }

      if (action === "prevChapter") {
        if (shortcutHandlersRef.current.prevChapter) {
          event.preventDefault();
          shortcutHandlersRef.current.prevChapter();
        }
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      const action = actionByKey.get(normalizeShortcutKey(event.key));
      if (action === "nextChapter") {
        holdScroll.stop();
      }
    }

    function onBlur() {
      holdScroll.stop();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      holdScroll.stop();
    };
  }, [bindings, horizon, shortcutHandlersRef]);
}
