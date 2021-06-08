/* eslint-disable */
import React, { useCallback, useEffect, useState, Fragment } from 'react';
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

function ImgList({ comic }) {
  const [loading, setLoading] = useState(false);
  const [imgList, setImgList] = useState([]);

  useEffect(async () => {
    if (comic) {
      // 获取到树状列表之后，前端排序
      const imgList = await api.fetchImgList(comic.id);
      setImgList(imgList);
    }
  }, [comic]);

  function renderList(list) {
    return list.map((item, index) => {
      if (item.name) {
        return <Fragment key={index}>{renderList(item.list)}</Fragment>;
      }

      return <img key={index} alt="" src={item} />;
    });
  }

  return <div className={styles.imglist}>{renderList(imgList)}</div>;
}

function ComicPage({ history }) {
  const [comic, setComic] = useState(null);
  const { id } = useParams();

  useEffect(async () => {
    const requestcomic = await api.fetchComic(id);
    setComic(requestcomic);
  }, [id]);

  return (
    <Container className={styles.fullpage}>
      <Header comic={comic} />
      <ImgList comic={comic} />
    </Container>
  );
}

export default ComicPage;
