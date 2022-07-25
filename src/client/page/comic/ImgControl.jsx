/* eslint-disable */
import React, { useCallback, useEffect } from 'react';
import classNames from 'classnames';
import Filter1Icon from '@material-ui/icons/Filter1';
import Filter2Icon from '@material-ui/icons/Filter2';
import Filter3Icon from '@material-ui/icons/Filter3';
import Filter4Icon from '@material-ui/icons/Filter4';
import ArrowCircleDown from '@material-ui/icons/ArrowDownward';
import { useRecoilRefresher_UNSTABLE } from 'recoil';
import HomeIcon from '@material-ui/icons/Home';
import { useHistory } from 'react-router-dom';
import * as  selector from '../../selector';
import useComicContext from './useComicContext';
import styles from './index.css';

function Control({ children }) {
  const { comic, filter, onClickFilter, autoScroll, setAutoScroll } =
    useComicContext();
  const history = useHistory();
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);

  useEffect(() => {
    const ori = document.title;
    document.title = comic.name;
    return () => {
      document.title = ori;
    }
  }, [comic.name]);

  const onClickHome = useCallback(() => {
    history.push('/');
  }, []);

  return (
    <div className={styles.toolbar}>
      <Filter1Icon
        className={classNames(styles.toolbaricon, {
          [styles.toolbarenabled]: filter === 1,
        })}
        onClick={() => onClickFilter(1)}
      />
      <Filter2Icon
        className={classNames(styles.toolbaricon, {
          [styles.toolbarenabled]: filter === 2,
        })}
        onClick={() => onClickFilter(2)}
      />
      <Filter3Icon
        className={classNames(styles.toolbaricon, {
          [styles.toolbarenabled]: filter === 3,
        })}
        onClick={() => onClickFilter(3)}
      />
      <Filter4Icon
        className={classNames(styles.toolbaricon, {
          [styles.toolbarenabled]: filter === 4,
        })}
        onClick={() => onClickFilter(4)}
      />
      <ArrowCircleDown
        className={classNames(styles.toolbaricon, {
          [styles.toolbarenabled]: autoScroll,
        })}
        onClick={() => setAutoScroll((v) => !v)}
      />
      <HomeIcon className={styles.toolbaricon} onClick={onClickHome}>
        Home
      </HomeIcon>
      {children}
    </div>
  );
}

export default Control;
