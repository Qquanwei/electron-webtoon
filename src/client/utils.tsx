/* eslint-disable react/display-name */
/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import { RecoilRoot } from "recoil";
import { useRecoilValueMemo } from "recoil-enhance";

export { useRecoilValueMemo };

export function withLocalRecoilRoot(Component) {
  return (...props) => {
    return (
      <RecoilRoot>
        <Component {...props} />
      </RecoilRoot>
    );
  };
}

export function arrayDeep(array) {
  if (Array.isArray(array)) {
    return 1 + Math.max.apply(null, array.map(arrayDeep));
  }
  if (Array.isArray(array.list)) {
    return 1 + Math.max.apply(null, array.list.map(arrayDeep));
  }
  return 0;
}
