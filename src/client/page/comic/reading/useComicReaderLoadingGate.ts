import { useEffect } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import * as selector from "../../../selector";

/** 将阅读器 loading 同步到全局遮罩，并在过渡完成后关闭遮罩。 */
export function useComicReaderLoadingGate(loading: boolean) {
  const openPhase = useRecoilValue(selector.comicOpenPhase);
  const setOpenPhase = useSetRecoilState(selector.comicOpenPhase);
  const setReaderLoading = useSetRecoilState(selector.comicReaderLoading);

  useEffect(() => {
    setReaderLoading(loading);
    return () => setReaderLoading(false);
  }, [loading, setReaderLoading]);

  useEffect(() => {
    if (openPhase === "loading" && !loading) {
      setOpenPhase("idle");
    }
  }, [openPhase, loading, setOpenPhase]);
}
