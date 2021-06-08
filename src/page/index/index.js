/* eslint-disable */
import React, { useCallback, useState, useEffect } from 'react';
import classNames from 'classnames';
import {
  GridList,
  GridListTile,
  GridListTileBar,
  Container,
} from '@material-ui/core';
import { Link } from 'react-router-dom';
import { takeDirectory } from '../../utils';
import plusSVG from './plus.svg';
import styles from './index.css';
import * as api from '../../api';

function IndexPage() {
  const [comicList, setComicList] = useState([]);

  const onClickAdd = useCallback(async () => {
    const path = await takeDirectory();
    if (!path.canceled) {
      await api.addComicToLibrary(path.filePaths[0]);
      setComicList(await api.fetchComicList());
    }
  }, []);

  useEffect(async () => {
    const list = await api.fetchComicList();
    setComicList(list);
  }, []);

  return (
    <Container>
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
        {comicList.map((comic, index) => {
          return (
            <GridListTile key={index} cols={1} className={styles.card}>
              <Link to={`/comic/${comic.id}`}>read</Link>
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
  );
}

export default IndexPage;
