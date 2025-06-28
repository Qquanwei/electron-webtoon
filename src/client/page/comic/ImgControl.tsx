/* eslint-disable */
import { useCallback, useEffect } from "react";
import classNames from "classnames";
import Filter1Icon from "@material-ui/icons/Filter1";
import Filter2Icon from "@material-ui/icons/Filter2";
import Filter3Icon from "@material-ui/icons/Filter3";
import Filter4Icon from "@material-ui/icons/Filter4";
import ArrowCircleDown from "@material-ui/icons/ArrowDownward";
import AddAPhotoIcon from "@material-ui/icons/AddAPhoto";
import HomeIcon from "@material-ui/icons/Home";
import { Tooltip } from "@material-ui/core";
import { useHistory } from "react-router-dom";
import useComicContext from "./useComicContext";
import Icon from "@components/Icon";
import { getIPC } from "@client/ipc";

const Control: React.FC<{}> = ({ children }) => {
  const {
    comic,
    filter,
    onClickFilter,
    autoScroll,
    setAutoScroll,
    refreshCurrentComic,
  } = useComicContext();
  const history = useHistory();

  useEffect(() => {
    const ori = document.title;
    if (comic) {
      document.title = comic.name;
    }
    return () => {
      document.title = ori;
    };
  }, [comic]);

  const onClickHome = useCallback(() => {
    history.push("/");
  }, []);

  const onClickAdd = useCallback(() => {}, []);

  const onClickHorizonMode = useCallback(async () => {
    const ipc = await getIPC();
    if (comic?.id) {
      await ipc.setComicProperty(comic.id, "pageMode", "horizon");
      refreshCurrentComic();
    }
  }, []);

  const onClickVerticalMode = useCallback(async () => {
    const ipc = await getIPC();
    if (comic?.id) {
      await ipc.setComicProperty(comic.id, "pageMode", "vertical");
      refreshCurrentComic();
    }
  }, []);

  return (
    <div className="fixed right-0 bottom-[20px] flex flex-col justify-end cursor-pointer px-[20px]">
      <Tooltip title="滤镜1" placement="top">
        <Filter1Icon
          className={classNames("bg-[#333] text-white", {
            ["text-orange-300"]: filter === 1,
          })}
          onClick={() => onClickFilter(1)}
        />
      </Tooltip>

      <Tooltip title="滤镜2" placement="top">
        <Filter2Icon
          className={classNames("bg-[#333] text-white mt-[10px]", {
            ["text-orange-300"]: filter === 2,
          })}
          onClick={() => onClickFilter(2)}
        />
      </Tooltip>
      <Tooltip title="滤镜3" placement="top">
        <Filter3Icon
          className={classNames("bg-[#333] text-white mt-[10px]", {
            ["text-orange-300"]: filter === 3,
          })}
          onClick={() => onClickFilter(3)}
        />
      </Tooltip>

      <Tooltip title="滤镜4" placement="top">
        <Filter4Icon
          className={classNames("bg-[#333] text-white mt-[10px]", {
            ["text-orange-300"]: filter === 4,
          })}
          onClick={() => onClickFilter(4)}
        />
      </Tooltip>

      <Icon
        name="comic"
        tooltip="日漫横屏翻页模式"
        className={classNames("text-white mt-[10px] w-[24px] h-[24px]", {
          ["bg-sky-300"]: comic?.pageMode === "horizon",
          ["bg-[#333]"]: comic?.pageMode !== "horizon",
        })}
        onClick={onClickHorizonMode}
      ></Icon>

      <Icon
        name="phone"
        tooltip="韩漫上下翻页模式"
        className={classNames("text-white mt-[10px] w-[24px] h-[24px]", {
          ["bg-sky-300"]: comic?.pageMode === "vertical",
          ["bg-[#333]"]: comic?.pageMode !== "vertical",
        })}
        onClick={onClickVerticalMode}
      ></Icon>

      <div
        title="收藏"
        className={classNames(["text-orange-300"], "hidden")}
        onClick={onClickAdd}
      >
        <AddAPhotoIcon></AddAPhotoIcon>
      </div>
      <Tooltip title="自动滚动" placement="top">
        <ArrowCircleDown
          className={classNames("bg-[#333] text-white mt-[10px]", {
            ["text-orange-300"]: autoScroll,
          })}
          onClick={() => setAutoScroll((v) => !v)}
        />
      </Tooltip>

      <Tooltip title="回到主页" placement="top">
        <HomeIcon
          className={"bg-[#333] text-white mt-[10px]"}
          onClick={onClickHome}
        >
          Home
        </HomeIcon>
      </Tooltip>

      {children}
    </div>
  );
};

export default Control;
