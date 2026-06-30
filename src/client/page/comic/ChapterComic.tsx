/* eslint-disable */
import React, { useCallback, useMemo, useState, useEffect } from "react";
import Typography from "@mui/material/Typography";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
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
    [comicId, onChange],
  );

  let deep = 0;
  function renderList(list: IImgListForMultipleChapter) {
    deep += 1;

    if (!list) {
      return null;
    }

    return list.map((item, index) => {
      if (!item.name) {
        return null;
      }

      const nested =
        item.list.length && deep < 2 ? (
          <List disablePadding className="pl-2">
            {renderList(item.list as IImgListForMultipleChapter)}
          </List>
        ) : null;

      return (
        <React.Fragment key={`${item.name}-${index}`}>
          <ListItem disablePadding className="text-slate-200">
            <ListItemButton
              selected={value === item}
              onClick={() => onClick(item)}
              title={item.name}
              className="text-slate-200 hover:bg-white/5"
            >
              <ListItemIcon className="min-w-[36px] text-slate-400">
                <ImportContactsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.name}
                primaryTypographyProps={{
                  className: classNames("text-slate-200", {
                    "!text-sky-400": value === item,
                  }),
                  noWrap: true,
                }}
              />
            </ListItemButton>
          </ListItem>
          {nested}
          <Divider className="border-slate-700/80" />
        </React.Fragment>
      );
    });
  }

  if (toggleChapter) {
    return null;
  }

  return (
    <aside className="sticky top-0 z-40 flex h-screen w-[320px] shrink-0 flex-col border-r border-slate-700/60 bg-[#141210] text-slate-200">
      <div className="shrink-0 border-b border-slate-700/60 px-5 py-5">
        <Breadcrumbs aria-label="breadcrumb">
          <Link to="/" className="text-sky-400 hover:text-sky-300">
            Home
          </Link>
          <Typography className="text-slate-300">{comic?.name}</Typography>
        </Breadcrumbs>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <List disablePadding>{renderList(imgList)}</List>
      </div>
    </aside>
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
      <div className="flex">
        <ChapterList
          toggleChapter={toggleChapter}
          imgList={chapterList}
          value={chapter}
          onChange={setChapter}
        />
        <div className="relative min-w-0 flex-1">
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
