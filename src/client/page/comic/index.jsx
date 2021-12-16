/* eslint-disable */
import React, { useCallback, useEffect, useState, Fragment, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import classNames from 'classnames';
import { useRecoilValue } from 'recoil';
import * as api from '../../api';
import * as selector from '../../selector';

import styles from './index.css';

function Header({ comic }) {
  return (
    <div className={styles.navbar}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link to="/" className={styles.link}>
          Home
        </Link>
        <Typography color="textPrimary">{comic?.name}</Typography>
      </Breadcrumbs>
    </div>
  );
}

function sortImgList(imgList) {
  const list = [...imgList];

  function tonum(name) {
    const num = Number(name.replace(/[^\d]/g, '')) || Infinity;
    return num;
  }

  list.sort((a, b) => {
    if (a.name) {
      a.list = sortImgList(a.list || []);
    }
    if (b.name) {
      b.list = sortImgList(b.list || []);
    }

    if (a.name && b.name) {
      return tonum(a.name) - tonum(b.name);
    }

    if (!a.name && !b.name) {
      return tonum(a) - tonum(b);
    }
    if (a.name) {
      return 1;
    }

    return -1;
  });

  return list;
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

  const onMouseUp = useCallback(() => {
    autoScrollRef.current = false;
  }, []);

  const onMouseDown = useCallback(() => {
    function scroll() {
      document.scrollingElement.scrollTop += 5;
      if (autoScrollRef.current) {
        requestAnimationFrame(scroll);
      }
    }
    autoScrollRef.current = true;
    requestAnimationFrame(scroll);
  }, []);

  useEffect(() => {
    document.scrollingElement.scrollTop = 0;
  }, [imgList]);
  return <div className={styles.imglist} onMouseUp={onMouseUp} onMouseDown={onMouseDown}>{renderList(imgList)}</div>;
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
      api.saveComicTag(comicId, chapter.name);
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
  const { imgList, comic } = useRecoilValue(selector.comicDetail(id));

  const [chapter, setChapter] = useState(() => {
    const defaultChapter = imgList.filter(item => {
      return item.name === comic.tag;
    });

    if (imgList[0].name) {
      return (defaultChapter[0] || imgList[0]);
    } else {
      return ({ list: imgList});
    }
  });

  return (
    <Container className={styles.container}>
      <Header comic={comic} />
      <ChapterList comicId={id} imgList={imgList} value={chapter} onChange={setChapter} />
      <ImgList imgList={chapter?.list || []} />
    </Container>
  );
}

export default ComicPage;