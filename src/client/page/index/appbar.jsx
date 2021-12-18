/* eslint-disable */
import React, { useRef, useCallback } from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import InputBase from '@material-ui/core/InputBase';
import SearchIcon from '@material-ui/icons/Search';
import IconButton from '@material-ui/core/IconButton';

import { useRecoilRefresher_UNSTABLE } from 'recoil';

import { version } from '../../../package.json';
import * as selector from '../../selector';
import ipc from '../../ipc';
import styles from './index.css';

function ElectronWebtoonAppBar({ onSearch }) {
  const searchRef = useRef(null);
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);

  const onSubmitSearch = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    onSearch(searchRef.current.value);
  }, []);

  const onClickAdd = useCallback(async () => {
    const path = await ipc.takeDirectory();
    if (!path.canceled) {
      await ipc.addComicToLibrary(path.filePaths[0]);
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
      <button className={styles.addbtn} onClick={onClickAdd}>+</button>
      <div  />
    </div>
  );
}

export default ElectronWebtoonAppBar;
