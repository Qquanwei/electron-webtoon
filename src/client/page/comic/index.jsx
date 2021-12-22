/* eslint-disable */
import React, { useCallback, useEffect, useState, Fragment, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import AppIcon from '@material-ui/icons/Apps';
import classNames from 'classnames';
import { useRecoilValue } from 'recoil';
import ipc from '../../ipc';
import * as selector from '../../selector';

import styles from './index.css';

function Header({ comic, onToggleChapter }) {
  return (
    <div>
      <div className={styles.toolbar}>
        <AppIcon className={styles.toggleicon} onClick={onToggleChapter} />
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

function ImgList({ imgList }) {
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

      return <img key={index} src={item} />;
    });
  }

  const autoScrollRef = useRef(false);
  const timerRef = useRef(0);

  const onMouseUp = useCallback(() => {
    autoScrollRef.current = false;
    clearTimeout(timerRef.current);
  }, []);

  const onMouseDown = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.preventDefault();
    function scroll() {
      document.scrollingElement.scrollTop += 2;
      if (autoScrollRef.current) {
        requestAnimationFrame(scroll);
      }
    }
    timerRef.current = setTimeout(() => {
      autoScrollRef.current = true;
      requestAnimationFrame(scroll);
    }, 200);
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
      ipc.saveComicTag(comicId, chapter.name);
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
  const [toggleChapter, setToggleChapter] = useState(false);
  const { imgList, comic } = useRecoilValue(selector.comicDetail(id));

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
      <Header comic={comic} onToggleChapter={onToggleChapter} />
      <ChapterList comicId={id} imgList={imgList} value={chapter} onChange={setChapter} />
      <ImgList imgList={chapter?.list || []} />
    </div>
  );
}

export default ComicPage;
