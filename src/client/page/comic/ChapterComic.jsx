/* eslint-disable */
import React, { useCallback, useMemo, Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import Typography from '@material-ui/core/Typography';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ImportContactsIcon from '@material-ui/icons/ImportContacts';
import ListItemText from '@material-ui/core/ListItemText';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import AppIcon from '@material-ui/icons/Apps';
import ImgControl from './ImgControl';
import ImgList from './imgList';
import useComicContext from './useComicContext';
import styles from './index.css';
import ipc from '../../ipc';

function ChapterList({ imgList, value, onChange, toggleChapter }) {
  const { comic } = useComicContext();
  const comicId = comic.id;
  const onClick = useCallback(
    async (chapter) => {
      if (onChange) {
        onChange(chapter);
        (await ipc).saveComicTag(comicId, chapter.name, 0);
      }
    },
    [onChange]
  );

  let deep = 0;
  function renderList(list) {
    deep += 1;

    if (!list) {
      return null;
    }

    return list.map((item, index) => {
      if (item.name) {
        return (
          <ListItem key={index}>
            <ListItemIcon>
              <ImportContactsIcon />
            </ListItemIcon>
            <ListItemText
              className={classNames(styles.chaptername, {
                [styles.current]: value === item,
              })}
            >
              <div onClick={() => onClick(item)} title={item.name}>
                {item.name}
              </div>
            </ListItemText>
            <Divider />
            {item.list.length && deep < 2 ? (
              <List>{renderList(item.list)}</List>
            ) : null}
          </ListItem>
        );
      }
    });
  }

  if (toggleChapter) {
    return null;
  }

  return (
    <div className={styles.chapterlistcontainer}>
      <div className={styles.navbar}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link to="/" className={styles.link}>
            Home
          </Link>
          <Typography>{comic?.name}</Typography>
        </Breadcrumbs>
      </div>
      <div className={styles.chapter}>{renderList(imgList)}</div>
    </div>
  );
}

function ChapterComic({ chapterList }) {
  const [toggleChapter, setToggleChapter] = useState(false);
  const { comic } = useComicContext();
  const [chapter, setChapter] = useState(() => {
    return (
      chapterList.filter((v) => {
        return v.name === comic.tag;
      })[0] || chapterList[0]
    );
  });

  const onToggleChapter = useCallback(() => {
    setToggleChapter((v) => !v);
  }, []);

  const hasNextPage = useMemo(() => {
    let index = -1;
    for (let i = 0; i < chapterList.length; ++i) {
      if (chapterList[i].name === chapter.name) {
        index = i;
        break;
      }
    }

    return index < chapterList.length - 1;
  }, [chapter, chapterList]);

  const onNextPage = useCallback(() => {
    setChapter((chapter) => {
      let index = -1;
      for (let i = 0; i < chapterList.length; ++i) {
        if (chapterList[i].name === chapter.name) {
          index = i;
          break;
        }
      }
      const newChapter = chapterList[index + 1];
      ipc.then((i) => {
        i.saveComicTag(comic.id, newChapter.name, 0);
      });

      return newChapter;
    });
  }, [chapterList, comic]);

  const onVisitPositionChange = useCallback(async (position) => {
    (await ipc).saveComicTag(comic.id, chapter.name, position);
  }, [chapter, comic]);

  return (
    <>
      <div className={styles.chaptercomiccontent}>
        <ChapterList
          toggleChapter={toggleChapter}
          imgList={chapterList}
          value={chapter}
          onChange={setChapter}
        />
        <div className={styles.chapterimglistcontainer}>
          <ImgList
            onVisitPosition={onVisitPositionChange}
            imgList={chapter.list || []}
            hasNextPage={hasNextPage}
            onNextPage={onNextPage}
          />
        </div>
      </div>
      <ImgControl>
        <AppIcon
          title="目录"
          className={styles.toolbaricon}
          onClick={onToggleChapter}
        >
          目录
        </AppIcon>
      </ImgControl>
    </>
  );
}

const ComicType = PropTypes.shape({
  name: PropTypes.string,
  imgList: PropTypes.arrayOf(PropTypes.string),
});

ChapterComic.propTypes = {
  chapter: ComicType,
  chapterList: PropTypes.arrayOf(ComicType),
};

export default ChapterComic;
