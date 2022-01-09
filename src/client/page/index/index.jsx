/* eslint-disable */
import React, { useRef, useCallback, useState, useEffect } from 'react';
import classNames from 'classnames';
import { useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import {
  GridList,
  GridListTile,
  GridListTileBar,
  Container,
  Menu,
  MenuItem
} from '@material-ui/core';


import IconButton from '@material-ui/core/IconButton';
import Badge from '@material-ui/core/Badge';
import MenuIcon from '@material-ui/icons/Menu';
import AccountCircle from '@material-ui/icons/AccountCircle';
import MailIcon from '@material-ui/icons/Mail';
import NotificationsIcon from '@material-ui/icons/Notifications';
import MoreIcon from '@material-ui/icons/MoreVert';


import { Link } from 'react-router-dom';
import ElectronWebtoonAppBar from './appbar';
import plusSVG from './plus.svg';
import styles from './index.css';
import ipc from '../../ipc';
import { useRecoilValueMemo } from '../../utils';
// 展示收藏
function StarBar({ list }) {
  return (
    <div className={styles.starbar}>
      <h1>收藏列表</h1>
      <div className={styles.starlist}>
        {
          list.map((comic, index) => {
            return (
              <div key={index} className={styles.card}
                data-id={comic.id}
              >
                <Link to={`/comic/${comic.id}`} >
                  <img alt="" src={comic.cover} width="100%" />
                </Link>
                <div>{ comic.name } </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

import * as  selector from '../../selector';

function IndexPage() {
  const [showMenu, setShowMenu] = useState(null);
  const [searchKey, setSearchKey] = useState('');
  const comicList = useRecoilValueMemo(selector.comicList);
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);

  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    setShowMenu(target);
  }, []);

  const onCloseMenu = useCallback(() => {
    setShowMenu(null);
  }, []);

  const onSubmitSearch = useCallback((value) => {
    setSearchKey(value);
  }, []);

  const onDeleteComic = useCallback(async () => {
    const element = showMenu;
    const { id } = element.dataset;
    await (await ipc).removeComic(id);
    refreshComicList();
    setShowMenu(null);
  }, [showMenu]);

  // <StarBar list={comicList} />
  return (
    <div className={styles.main}>
      <ElectronWebtoonAppBar onSearch={onSubmitSearch} />
      <h1>漫画库</h1>
      <Container className={styles.container}>
        <Menu
          id="simple-menu"
          anchorEl={showMenu}
          keepMounted
          open={Boolean(showMenu)}
          onClose={onCloseMenu}
        >
          <MenuItem onClick={onDeleteComic}>Delete</MenuItem>
        </Menu>


        <div className={styles.gridlist}>
          {comicList.filter(comic => {
            return comic.name.indexOf(searchKey) !== -1
          }).map((comic, index) => {
            return (
              <div key={index} className={styles.card}
                data-id={comic.id}
                onContextMenu={onContextMenu}>
                <div className={styles['card-content']}>
                  <Link to={`/comic/${comic.id}`} >
                    <img alt="" src={comic.cover} width="100%" />
                  </Link>
                </div>
                <div className={styles.name }>
                  { comic.name}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
      <div className={styles.support}>
        贡献和支持
        <a
          target="_blank"
          href="https://github.com/Qquanwei/electron-webtoon"
          rel="noreferrer"
        >
          Github
        </a>
      </div>
    </div>
  );
}

export default IndexPage;
