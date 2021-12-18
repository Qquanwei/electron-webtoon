/* eslint-disable import/prefer-default-export */
import { useRef } from 'react';
import { useRecoilValueLoadable } from 'recoil';

export function useRecoilValueMemo(recoilState) {
  const cacheValueRef = useRef();
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
