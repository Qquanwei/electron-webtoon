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

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import InputBase from '@material-ui/core/InputBase';
import Badge from '@material-ui/core/Badge';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import AccountCircle from '@material-ui/icons/AccountCircle';
import MailIcon from '@material-ui/icons/Mail';
import NotificationsIcon from '@material-ui/icons/Notifications';
import MoreIcon from '@material-ui/icons/MoreVert';


import { Link } from 'react-router-dom';
import { takeDirectory } from '../../utils';
import plusSVG from './plus.svg';
import styles from './index.css';
import * as api from '../../api';

function IndexPage() {
  const [comicList, setComicList] = useState([]);
  const [showMenu, setShowMenu] = useState(null);
  const [searchKey, setSearchKey] = useState('');
  const searchRef = useRef(null);

  const onClickAdd = useCallback(async () => {
    const path = await takeDirectory();
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

  const onSubmitSearch = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setSearchKey(searchRef.current.value);
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

  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" noWrap>
            ElectronWebtoon
          </Typography>
          <div className={styles.search}>
            <div className={styles.searchicon}>
              <SearchIcon />
            </div>
            <form onSubmit={onSubmitSearch}>
              <InputBase
                inputRef={searchRef}
                className={styles.searchinput}
                placeholder="Search…"
                inputProps={{ 'aria-label': 'search' }}
              />
            </form>
          </div>
          <div  />
        </Toolbar>
      </AppBar>
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


        <GridList cellHeight={160} cols={3} className={styles.gridlist}>
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
                <GridListTileBar title={comic.path} />
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
