import { EmptyFunction, IComic, UnaryFunction } from "@shared/type";
import React, { useContext, useRef } from "react";

export interface ComicShortcutHandlers {
  nextChapter?: () => void;
  prevChapter?: () => void;
  turnHorizonPage?: (direction: "forward" | "back") => void;
}

export interface IComicContext {
  autoScroll: boolean;
  filter?: number;
  comic?: IComic;
  zoomScale: number;
  onClickFilter: UnaryFunction<number>;
  setAutoScroll: React.Dispatch<React.SetStateAction<boolean>>;
  setZoomScale: (value: number | ((prev: number) => number)) => void;
  refreshCurrentComic: EmptyFunction;
  shortcutHandlersRef: React.MutableRefObject<ComicShortcutHandlers>;
}

const context = React.createContext<IComicContext>(undefined!);

export const { Provider } = context;

export default () => useContext(context);
