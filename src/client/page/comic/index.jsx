/* eslint-disable */
import React, { useCallback, useEffect, useState, Fragment, useRef } from 'react';
import { useParams, Link, useHistory } from 'react-router-dom';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import AppIcon from '@material-ui/icons/Apps';
import HomeIcon from '@material-ui/icons/Home';
import Filter1Icon from '@material-ui/icons/Filter1';
import Filter2Icon from '@material-ui/icons/Filter2';
import Filter3Icon from '@material-ui/icons/Filter3';
import Filter4Icon from '@material-ui/icons/Filter4';
import ArrowCircleDown from '@material-ui/icons/ArrowDownward';
import classNames from 'classnames';
import { withLocalRecoilRoot, arrayDeep } from '../../utils';
import { useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import ipc from '../../ipc';
import * as selector from '../../selector';

import styles from './index.css';

function Header({
  filter,
  comic,
  autoScroll,
  setAutoScroll,
  onToggleChapter,
  onClickFilter }) {
  const history = useHistory();

  const onClickHome = useCallback(() => {
    history.push('/');
  }, []);

  return (
    <div>
      <div className={styles.toolbar}>
        <Filter1Icon className={classNames(styles.toolbaricon, {
          [styles.toolbarenabled]: filter === 1
        })} onClick={() => onClickFilter(1)} />
        <Filter2Icon className={classNames(styles.toolbaricon, {
          [styles.toolbarenabled]: filter === 2
        })} onClick={() => onClickFilter(2)} />
        <Filter3Icon className={classNames(styles.toolbaricon, {
          [styles.toolbarenabled]: filter === 3
        })} onClick={() => onClickFilter(3)} />
        <Filter4Icon className={classNames(styles.toolbaricon, {
          [styles.toolbarenabled]: filter === 4
        })} onClick={() => onClickFilter(4)} />
        <ArrowCircleDown className={classNames(styles.toolbaricon, {
          [styles.toolbarenabled]: autoScroll
        })} onClick={() => setAutoScroll(v => !v)} />
        <HomeIcon className={styles.toolbaricon} onClick={onClickHome} >Home</HomeIcon>
        <AppIcon
          title="目录"
          className={styles.toolbaricon} onClick={onToggleChapter} >目录</AppIcon>
      </div>
      <div className={styles.navbar}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link to="/" className={styles.link}>
            Home
          </Link>
          <Typography>{comic?.name}</Typography>
        </Breadcrumbs>
      </div>
    </div>
  );
}

function ImgList({ imgList, filter, autoScroll, setAutoScroll }) {
  function renderList(list) {
    return list.map((item, index) => {
      if (item.name) {
        return (
          <Fragment key={index}>
            <div id={item.name}></div>
            {renderList(item.list)}
          </Fragment>
        );
      }

      return <img key={index} src={item} className={styles[`filter-${filter}`]} />;
    });
  }

  const autoScrollRef = useRef(false);

  useEffect(() => {
    if (autoScroll) {
      autoScrollRef.current = true;
      function scroll() {
        document.scrollingElement.scrollTop += 4;
        if (autoScrollRef.current) {
          requestAnimationFrame(scroll);
        }
      }
      autoScrollRef.current = true;
      requestAnimationFrame(scroll);
    } else {
      autoScrollRef.current = false;
    }

    return () => {
      autoScrollRef.current = false;
    }
  }, [autoScroll]);



  const onMouseUp = useCallback(() => {
    setAutoScroll(false);
  }, []);

  const onMouseDown = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
    setAutoScroll(true);
  }, []);

  useEffect(() => {
    document.scrollingElement.scrollTop = 0;
  }, [imgList]);
  return (
    <div
      className={styles.imglist}
      onTouchStart={onMouseDown}
      onTouchEnd={onMouseUp}
      onMouseUp={onMouseUp}
      onMouseDown={onMouseDown}>
      {renderList(imgList)}
    </div>
  );
}

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';
import ImportContactsIcon from '@material-ui/icons/ImportContacts';

function ChapterList({ comicId, imgList, value, onChange }) {
  const onClick = useCallback(async (chapter) => {
    if (onChange) {
      onChange(chapter);
      (await ipc).saveComicTag(comicId, chapter.name);
    }
  }, [onChange]);

  let deep = 0;
  function renderList(list) {
    deep += 1;

    if (list === null) {
      return null;
    }

    return list.map((item, index) => {
      if (item.name) {
        return (
          <ListItem key={index}>
            <ListItemIcon>
              <ImportContactsIcon />
            </ListItemIcon>
            <ListItemText className={classNames(styles.chaptername, { [styles.current]: value === item})}>
              <div onClick={() => onClick(item)} title={item.name}>{ item.name }</div>
            </ListItemText>
            <Divider />
            {
              (item.list.length && deep < 2) ? (
                <List>
                  {renderList(item.list)}
                </List>
              ) : null
            }
          </ListItem>
        );
      }
    });
  }

  if (imgList.length === 0) {
    return null;
  }

  return (
    <div className={styles.chapter}>
      <List>
        { renderList(imgList) }
      </List>
    </div>
  )
}

import {
  GridList,
  GridListTile,
  GridListTileBar,
  Menu,
  MenuItem
} from '@material-ui/core';

function ComicPage({ history }) {
  const { id } = useParams();
  const [autoScroll, setAutoScroll] = useState(false);
  const [filter, setFilter] = useState(0);
  const { imgList, comic } = useRecoilValue(selector.comicDetail(id));
  const refresh = useRecoilRefresher_UNSTABLE(selector.comicDetail(id));
  const [toggleChapter, setToggleChapter] = useState(() => {
    return arrayDeep(imgList) == 1;
  });

  useEffect(() => {
    return refresh;
  }, [refresh]);

  const onClickFilter = useCallback((index) => {
    if (filter === index) {
      setFilter(0);
    } else {
      setFilter(index);
    }
  }, [filter]);

  const [chapter, setChapter] = useState(() => {
    const defaultChapter = imgList.filter(item => {
      return item.name === comic.tag;
    });

    if (imgList[0].name) {
      return (defaultChapter[0] || imgList[0]);
    } else {
      return { list: imgList };
    }
  });

  const onToggleChapter = useCallback(() => {
    setToggleChapter(v => !v);
  }, []);

  return (
    <div className={classNames(
      styles.container,
      toggleChapter ? styles.closechapter : ''
    )}>
      <Header
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
        filter={filter} comic={comic} onToggleChapter={onToggleChapter} onClickFilter={onClickFilter} />
      <ChapterList comicId={id} imgList={imgList} value={chapter} onChange={setChapter} />
      <ImgList
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
        filter={filter} imgList={chapter?.list || []} />
    </div>
  );
}

export default withLocalRecoilRoot(ComicPage);
