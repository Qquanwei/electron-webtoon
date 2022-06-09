import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import shuffle from 'lodash.shuffle';
import store from '../store';
import { LOADING_COVERLIST_KEY } from '../../config';
import styles from './loading.css';
/* eslint-disable @typescript-eslint/no-shadow */
// 自动从所有图片中选一张作为loading图。
// 首次打开APP时没有图片则展示默认的文字，当第一次启动过后，就可以拿到封面。
// 不过封面数据不能再从recoil中获取，而应该使用同步的方式，立即拿到, localStorage 应该能够满足
function Loading() {
  const [coverList, setCoverList] = useState([]);

  useEffect(() => {
    const coverList = store.get(LOADING_COVERLIST_KEY);
    if (coverList) {
      setCoverList(shuffle(coverList));
    }
  }, []);

  if (coverList.length === 0) {
    return <div>loading...</div>;
  }

  return (
    <div className={styles.loading}>
      <img src={coverList[0]} alt="" />
      <div className={classNames(styles.text, 'f-fcc')}>now loading....</div>
    </div>
  );
}

export default Loading;
