import { useRecoilValue } from "recoil";
import StartUpPage from "./startPage";
import * as selector from "./selector";

/** 首页打开漫画时的全局过渡 / 加载遮罩，跨路由保持单实例。 */
export function ComicOpenOverlay() {
  const openPhase = useRecoilValue(selector.comicOpenPhase);
  const readerLoading = useRecoilValue(selector.comicReaderLoading);
  const visible = openPhase !== "idle" || readerLoading;

  return <StartUpPage visible={visible} className="z-50" />;
}

/** 冷启动或普通路由 Suspense，打开漫画过渡期间不重复挂载遮罩。 */
export function RouteSuspenseFallback() {
  const openPhase = useRecoilValue(selector.comicOpenPhase);
  if (openPhase !== "idle") {
    return null;
  }
  return <StartUpPage />;
}
