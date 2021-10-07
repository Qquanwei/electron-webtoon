/* eslint-disable */
import React, { useRef, useCallback, useState, useEffect } from 'react';
import classNames from 'classnames';
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
import ipc from '../../utils';
import plusSVG from './plus.svg';
import styles from './index.css';
import * as api from '../../api';

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

function IndexPage() {
  const [comicList, setComicList] = useState([]);
  const [showMenu, setShowMenu] = useState(null);
  const [searchKey, setSearchKey] = useState('');

  const onClickAdd = useCallback(async () => {
    const path = await ipc.takeDirectory();
    if (!path.canceled) {
      await api.addComicToLibrary(path.filePaths[0]);
      setComicList(await api.fetchComicList());
    }
  }, []);

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
    await api.removeComic(id);
    window.localStorage.setItem(id, '');
    setShowMenu(null);
    setComicList(await api.fetchComicList());
  }, [showMenu]);

  useEffect(async () => {
    const list = await api.fetchComicList();
    setComicList(list);
  }, []);

  // <StarBar list={comicList} />
  return (
    <div>
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


        <GridList cellHeight={160} spacing={2} cols={3} className={styles.gridlist}>
          <GridListTile cols={1} className={classNames(styles.card)}>
            <div
              className={classNames(
                styles.flexcenter,
                styles.full,
                styles.addcard
              )}
              onClick={onClickAdd}
            >
              <img alt="" src={plusSVG} className={styles.plusicon} />
            </div>
          </GridListTile>
          {comicList.filter(comic => {
            return comic.name.indexOf(searchKey) !== -1
          }).map((comic, index) => {
            return (
              <GridListTile key={index} cols={1} className={styles.card}
                data-id={comic.id}
                onContextMenu={onContextMenu}>
                <Link to={`/comic/${comic.id}`} >
                  <img alt="" src={comic.cover} width="100%" />
                </Link>
                <GridListTileBar title={comic.name} />
              </GridListTile>
            );
          })}
        </GridList>

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
      </Container>
    </div>
  );
}

export default IndexPage;
