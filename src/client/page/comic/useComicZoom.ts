import { useCallback, useEffect, useRef, useState } from "react";
import { getIPC } from "@client/ipc";
import {
  applyWheelZoom,
  clampComicZoom,
  COMIC_ZOOM_PROPERTY,
  formatComicZoom,
  parseComicZoom,
} from "../../../shared/comicZoom";
import type { IComic } from "@shared/type";
import useComicContext from "./useComicContext";

const SAVE_DELAY_MS = 400;

export function useComicZoomState(comic?: IComic) {
  const [zoomScale, setZoomScaleState] = useState(() =>
    parseComicZoom(comic?.zoomScale),
  );
  const pendingZoomRef = useRef<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const comicIdRef = useRef(comic?.id);
  comicIdRef.current = comic?.id;

  useEffect(() => {
    setZoomScaleState(parseComicZoom(comic?.zoomScale));
  }, [comic?.id, comic?.zoomScale]);

  const flushSave = useCallback(async (scale: number) => {
    const id = comicIdRef.current;
    if (!id) return;
    const ipc = await getIPC();
    await ipc.setComicProperty(id, COMIC_ZOOM_PROPERTY, formatComicZoom(scale));
  }, []);

  const setZoomScale = useCallback(
    (value: number | ((prev: number) => number)) => {
      setZoomScaleState((prev) => {
        const next = clampComicZoom(
          typeof value === "function" ? value(prev) : value,
        );
        pendingZoomRef.current = next;
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          pendingZoomRef.current = null;
          void flushSave(next);
        }, SAVE_DELAY_MS);
        return next;
      });
    },
    [flushSave],
  );

  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
      if (pendingZoomRef.current !== null) {
        void flushSave(pendingZoomRef.current);
      }
    };
  }, [flushSave]);

  return { zoomScale, setZoomScale };
}

export function useComicZoomWheel() {
  const { setZoomScale } = useComicContext();

  useEffect(() => {
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setZoomScale((current) => applyWheelZoom(current, event.deltaY));
    }

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
    };
  }, [setZoomScale]);
}
