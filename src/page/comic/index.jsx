/* eslint-disable */
import React, { useCallback, useEffect, useState, Fragment, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import classNames from 'classnames';
import * as api from '../../api';

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
    const num = Number(name.replace(/[^\d-]/g, '')) || Infinity;
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

  return <div className={styles.imglist}>{renderList(imgList)}</div>;
}

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';
import ImportContactsIcon from '@material-ui/icons/ImportContacts';

function ChapterList({ imgList, value, onChange }) {
  const onClick = useCallback((chapter) => {
    if (onChange) {
      console.log('onChange', chapter);
      onChange(chapter);
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
            <ListItemText>
              <div onClick={() => onClick(item)}>{ item.name }</div>
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
  const [comic, setComic] = useState(null);
  const [chapter, setChapter] = useState([]);
  const [imgList, setImgList] = useState([]);
  const { id } = useParams();

  useEffect(async () => {
    // 获取到树状列表之后，前端排序
    const imgList = await api.fetchImgList(id);
    setImgList(sortImgList(imgList));
    setChapter(imgList[0]);
  }, [id]);

  useEffect(async () => {
    const requestcomic = await api.fetchComic(id);
    setComic(requestcomic);
  }, [id]);

  return (
    <Container className={styles.container}>
      <Header comic={comic} />
      <ChapterList imgList={imgList} value={chapter} onChange={setChapter} />
      <ImgList imgList={chapter?.list || []} />
    </Container>
  );
}

export default ComicPage;
