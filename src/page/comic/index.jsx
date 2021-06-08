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

function ImgList({ comic }) {
  const [loading, setLoading] = useState(false);
  const [imgList, setImgList] = useState([]);
  const containerRef = useRef(null);

  useEffect(async () => {
    if (comic) {
      // 获取到树状列表之后，前端排序
      const imgList = await api.fetchImgList(comic.id);
      setImgList(imgList);
      const picName = window.localStorage.getItem(comic.id);
      const element = document.getElementById(picName);
      if (element) {
        // 跳转到该位置
        element.scrollIntoView();
      }
    }
  }, [comic]);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 1.0
    };

    const observer = new IntersectionObserver((e) => {
      e.forEach((entry) => {
        if (entry.intersectionRatio === 1) {
          // 这张图片完全进入可视区域
          const { target } = entry;
          // 上次看到的位置
          const { id, pic } = target.dataset;
          window.localStorage.setItem(id, pic);
        }
      });
    }, options);


    const imgs = containerRef.current.getElementsByTagName('img');
    imgs.forEach(img => {
      observer.observe(img);
    });

    return () => {
      observer.disconnect();
    }
  }, [imgList]);

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

      return <img key={index} id={item} data-id={comic?.id} data-pic={item} src={item} />;
    });
  }

  return <div className={styles.imglist} ref={containerRef}>{renderList(imgList)}</div>;
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
