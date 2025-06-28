import { IComic, UnaryFunction } from "@shared/type";
import React, { useContext } from "react";

interface IComicContext {
  autoScroll: boolean;
  filter?: number;
  comic?: IComic;
  onClickFilter: UnaryFunction<number>;
  setAutoScroll: React.Dispatch<React.SetStateAction<boolean>>;
}

const context = React.createContext<IComicContext>(undefined!);

export const { Provider } = context;

export default () => useContext(context);
