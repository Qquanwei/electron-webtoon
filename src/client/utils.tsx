/* eslint-disable react/display-name */
/* eslint-disable react/jsx-props-no-spreading */
import React, { useRef, useEffect } from 'react';
import { useRecoilValueLoadable, RecoilRoot } from 'recoil';

export function useRecoilValueMemo(recoilState) {
  const cacheValueRef = useRef(null);
  const { state, contents } = useRecoilValueLoadable(recoilState);

  if (state === 'error') {
    throw contents;
  }
  if (state === 'loading' && !cacheValueRef.current) {
    throw contents;
  }
  if (state === 'hasValue') {
    cacheValueRef.current = contents;
  }

  return cacheValueRef.current;
}

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
