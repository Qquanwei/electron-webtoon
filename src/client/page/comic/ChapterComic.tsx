/* eslint-disable */
import React, { useCallback, useMemo, useState } from "react";
import Typography from "@material-ui/core/Typography";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ImportContactsIcon from "@material-ui/icons/ImportContacts";
import ListItemText from "@material-ui/core/ListItemText";
import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import classNames from "classnames";
import { Link } from "react-router-dom";
import Divider from "@material-ui/core/Divider";
import List from "@material-ui/core/List";
import AppIcon from "@material-ui/icons/Apps";
import ImgControl from "./ImgControl";
import ImgList from "./imgList";
import useComicContext from "./useComicContext";
import {
  IChapter,
  IImgListForMultipleChapter,
  IImgListForSingleChapter,
  UnaryFunction,
} from "@shared/type";
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
          ipc.saveComicTag(comicId, chapter.name, 0);
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

      getIPC().then((ipc) => {
        ipc.saveComicTag(comic?.id || "", newChapter.name, 0);
      });

      return newChapter;
    });
  }, [chapterList, comic]);

  const onVisitPositionChange = useCallback(
    async (position) => {
      const ipc = await getIPC();
      ipc.saveComicTag(comic?.id || "", chapter.name, position);
    },
    [chapter, comic],
  );

  return (
    <>
      <div className={"flex grow relative"}>
        <ChapterList
          toggleChapter={toggleChapter}
          imgList={chapterList}
          value={chapter}
          onChange={setChapter}
        />
        <div className={"grow relative"}>
          <ImgList
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
