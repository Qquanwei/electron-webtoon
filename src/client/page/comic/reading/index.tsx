import { useEffect } from "react";
import { resolveComicPageMode } from "@shared/type";
import useComicContext from "../useComicContext";
import HorizonReader from "./HorizonReader";
import VerticalReader from "./VerticalReader";
import type { ImgListProps } from "./types";
import { resetVerticalScroll } from "./utils";

export default function ImgList(props: ImgListProps) {
  const { comic } = useComicContext();
  const isHorizon = resolveComicPageMode(comic?.pageMode) === "horizon";

  useEffect(() => {
    resetVerticalScroll();
  }, [props.imgList]);

  if (isHorizon) {
    return <HorizonReader {...props} />;
  }

  return <VerticalReader {...props} />;
}

export type { ImgListProps } from "./types";
