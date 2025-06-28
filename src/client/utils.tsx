import { RecoilRoot } from "recoil";
import { useRecoilValueMemo } from "recoil-enhance";

export { useRecoilValueMemo };

export function withLocalRecoilRoot(Component: any) {
  return (...props: any[]) => {
    return (
      <RecoilRoot>
        <Component {...props} />
      </RecoilRoot>
    );
  };
}

export function once<T extends unknown[], K>(fun: (...params: T) => K) {
  let val: K;
  let invoke = false;
  return (...params: T) => {
    if (invoke) {
      return val;
    }
    val = fun.apply(null, params);
    invoke = true;
    return val;
  };
}
