/* eslint-disable */
import React, { useRef, useCallback, useEffect } from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import InputBase from '@material-ui/core/InputBase';
import SearchIcon from '@material-ui/icons/Search';
import IconButton from '@material-ui/core/IconButton';
import ScreenLockPortraitIcon from '@material-ui/icons/ScreenLockPortrait';
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';

import { useRecoilRefresher_UNSTABLE } from 'recoil';
import Qrcode from './qrcode';
import { version } from '../../../package.json';
import * as selector from '../../selector';
import ipc from '../../ipc';
import styles from './index.css';

function ElectronWebtoonAppBar({ onSearch }) {
  const imgRef = useRef(null);
  const searchRef = useRef(null);
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);

  const onSubmitSearch = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    onSearch(searchRef.current.value);
  }, []);

  useEffect(() => {
    async function work() {
      (await ipc).onCompressFile((msg) => {
        document.title = `${msg}`
      });

      (await ipc).onCompressDone(() => {
        document.title = '处理完毕';
        refreshComicList();
        setTimeout(() => {
          document.title = 'ElectronWebtoon';
        }, 1000);
      });
    }
    work();
  }, [refreshComicList]);

  const onClickAddFile = useCallback(async () => {
    (await ipc).takeCompressAndAddToComic();
  }, []);

  const onClickAddFolder = useCallback(async () => {
    const path = await (await ipc).takeDirectory();

    if (!path.canceled) {
      await (await ipc).addComicToLibrary(path.filePaths[0]);
      refreshComicList();
    }
  }, []);

  return (
    <div className={styles.appbar}>
      <Typography variant="h6" noWrap>
        ElectronWebtoon
        <span className={styles.font10}>
          @{version}
        </span>
      </Typography>
      <div className={styles.search}>
        <div className={styles.searchicon}>
          <SearchIcon />
        </div>
        <form onSubmit={onSubmitSearch}>
          <input
            ref={searchRef}
            className={styles.searchinput}
            placeholder="Search…"
          />
        </form>
      </div>
      <Popup position="bottom center" trigger={
        <button className={styles.mobilebtn}>
          <ScreenLockPortraitIcon />
        </button>
      }>
        <Qrcode />
      </Popup>
      <Popup position="bottom" trigger={
        <button className={styles.addbtn}>+</button>
      }>
        <div className={styles.createactionlist}>
          <button onClick={onClickAddFolder}>打开文件夹</button>
          <button onClick={onClickAddFile}>打开压缩包</button>
        </div>
      </Popup>
      <div  />
    </div>
  );
}

export default ElectronWebtoonAppBar;
