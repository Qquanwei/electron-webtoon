import { atom, useRecoilState } from "recoil";
import {
  IDLE_DECOMPRESS_PROGRESS,
  IDecompressProgress,
} from "../../shared/type";

const decompressProgressAtom = atom<IDecompressProgress>({
  key: "decompressProgressAtom",
  default: IDLE_DECOMPRESS_PROGRESS,
});

export function useDecompressProgress() {
  const [progress, setProgress] = useRecoilState(decompressProgressAtom);

  return { progress, setProgress };
}
