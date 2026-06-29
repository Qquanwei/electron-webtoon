import { EmptyFunction, IComic, UnaryFunction } from "@shared/type";
import React, { useContext, useRef } from "react";

export interface ComicShortcutHandlers {
  nextChapter?: () => void;
  prevChapter?: () => void;
}

export interface IComicContext {
  autoScroll: boolean;
  filter?: number;
  comic?: IComic;
  onClickFilter: UnaryFunction<number>;
  setAutoScroll: React.Dispatch<React.SetStateAction<boolean>>;
  refreshCurrentComic: EmptyFunction;
  shortcutHandlersRef: React.MutableRefObject<ComicShortcutHandlers>;
}

const context = React.createContext<IComicContext>(undefined!);

export const { Provider } = context;

export default () => useContext(context);
