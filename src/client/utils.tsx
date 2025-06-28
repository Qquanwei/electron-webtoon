/* eslint-disable react/display-name */
/* eslint-disable react/jsx-props-no-spreading */
import { UnaryFunction } from "@shared/type";
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

export function arrayDeep(array: any) {
  if (Array.isArray(array)) {
    return 1 + Math.max.apply(null, array.map(arrayDeep));
  }
  if (Array.isArray(array.list)) {
    return 1 + Math.max.apply(null, array.list.map(arrayDeep));
  }
  return 0;
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
