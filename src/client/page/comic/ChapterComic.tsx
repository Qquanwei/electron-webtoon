/* eslint-disable */
import React, { useCallback, useMemo, useState, useEffect } from "react";
import Typography from "@mui/material/Typography";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ImportContactsIcon from "@mui/icons-material/ImportContacts";
import ListItemText from "@mui/material/ListItemText";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import classNames from "classnames";
import { Link } from "react-router-dom";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import AppIcon from "@mui/icons-material/Apps";
import ImgControl from "./ImgControl";
import ImgList from "./imgList";
import useComicContext from "./useComicContext";
import {
  IChapter,
  IImgListForMultipleChapter,
  IImgListForSingleChapter,
  UnaryFunction,
} from "@shared/type";
import {
  getAdjacentChapter,
  hasNextChapter,
  hasPrevChapter,
} from "./chapterUtils";
import { getIPC } from "@client/ipc";

const ChapterList: React.FC<{
  imgList: IImgListForMultipleChapter;
  toggleChapter: boolean;
  value: IChapter;
  onChange: UnaryFunction<IChapter>;
}> = ({ imgList, value, onChange, toggleChapter }) => {
  const { comic } = useComicContext();
  const comicId = comic?.id;
  const onClick = useCallback(
    async (chapter) => {
      if (onChange) {
        onChange(chapter);
        const ipc = await getIPC();
        if (comicId) {
          await ipc.saveComicTag(comicId, chapter.name, 0);
        }
      }
    },
    [onChange],
  );

  let deep = 0;
  function renderList(list: IImgListForMultipleChapter) {
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
              className={classNames("cursor-pointer", {
                ["text-sky-500"]: value === item,
              })}
            >
              <div onClick={() => onClick(item)} title={item.name}>
                {item.name}
              </div>
            </ListItemText>
            <Divider />
            {item.list.length && deep < 2 ? (
              <List>{renderList(item.list as IImgListForMultipleChapter)}</List>
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
    <div className={"basis-[320px] shrink-0 grow-0"}>
      <div
        className={"fixed top-0 left-0 z-10 bg-gray-300/10 py-[20px] px-[20px]"}
      >
        <Breadcrumbs aria-label="breadcrumb">
          <Link to="/" className={"text-[#333]"}>
            Home
          </Link>
          <Typography>{comic?.name}</Typography>
        </Breadcrumbs>
      </div>
      <div
        className={
          "fixed border-box left-0 top-[50px] w-[300px] h-[calc(100%-100px)] overflow-auto"
        }
      >
        {renderList(imgList)}
      </div>
    </div>
  );
};

const ChapterComic: React.FC<{ chapterList: IImgListForMultipleChapter }> = ({
  chapterList,
}) => {
  const [toggleChapter, setToggleChapter] = useState(false);
  const { comic } = useComicContext();
  const [chapter, setChapter] = useState(() => {
    return (
      chapterList.filter((v) => {
        return v.name === comic?.tag;
      })[0] || chapterList[0]
    );
  });

  const onToggleChapter = useCallback(() => {
    setToggleChapter((v) => !v);
  }, []);

  const hasNextPage = useMemo(
    () => hasNextChapter(chapterList, chapter),
    [chapter, chapterList],
  );

  const saveChapterTag = useCallback(
    (nextChapter: IChapter) => {
      getIPC().then((ipc) => {
        ipc.saveComicTag(comic?.id || "", nextChapter.name, 0);
      });
    },
    [comic?.id],
  );

  const onNextPage = useCallback(() => {
    setChapter((current) => {
      const nextChapter = getAdjacentChapter(chapterList, current, 1);
      if (nextChapter === current) {
        return current;
      }
      saveChapterTag(nextChapter);
      return nextChapter;
    });
  }, [chapterList, saveChapterTag]);

  const onPrevPage = useCallback(() => {
    setChapter((current) => {
      const prevChapter = getAdjacentChapter(chapterList, current, -1);
      if (prevChapter === current) {
        return current;
      }
      saveChapterTag(prevChapter);
      return prevChapter;
    });
  }, [chapterList, saveChapterTag]);

  const { shortcutHandlersRef } = useComicContext();

  useEffect(() => {
    shortcutHandlersRef.current.nextChapter = hasNextPage ? onNextPage : undefined;
    shortcutHandlersRef.current.prevChapter = hasPrevChapter(chapterList, chapter)
      ? onPrevPage
      : undefined;

    return () => {
      shortcutHandlersRef.current.nextChapter = undefined;
      shortcutHandlersRef.current.prevChapter = undefined;
    };
  }, [
    chapter,
    chapterList,
    hasNextPage,
    onNextPage,
    onPrevPage,
    shortcutHandlersRef,
  ]);

  const onVisitPositionChange = useCallback(
    async (position) => {
      const ipc = await getIPC();
      ipc.saveComicTag(comic?.id || "", chapter.name, position);
    },
    [chapter, comic],
  );

  return (
    <>
      <div className="flex relative">
        <ChapterList
          toggleChapter={toggleChapter}
          imgList={chapterList}
          value={chapter}
          onChange={setChapter}
        />
        <div className="grow relative flex w-[calc(100%-320px)]">
          <ImgList
            tag={chapter.name}
            onVisitPosition={onVisitPositionChange}
            imgList={(chapter.list || []) as IImgListForSingleChapter}
            hasNextPage={hasNextPage}
            onNextPage={onNextPage}
          />
        </div>
      </div>
      <ImgControl>
        <AppIcon
          className={"bg-[#333] text-white mt-[10px]"}
          onClick={onToggleChapter}
        >
          目录
        </AppIcon>
      </ImgControl>
    </>
  );
};

export default ChapterComic;
