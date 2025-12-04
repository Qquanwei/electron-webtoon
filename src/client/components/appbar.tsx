import React, { useRef, useCallback, useEffect, useState } from "react";
import Typography from "@material-ui/core/Typography";
import SearchIcon from "@material-ui/icons/Search";
import Alert from "@material-ui/lab/Alert";
import { Snackbar } from "@material-ui/core";
import { Link } from "react-router-dom";
import { useRecoilRefresher_UNSTABLE } from "recoil";
import * as selector from "../selector";
import { getIPC } from "../ipc";
import { UnaryFunction } from "../../shared/type";
import Popup from "./Popup";
import { useMessage } from "./useMessage";

interface ElectronWebtoonAppBarProps {
  onSearch?: UnaryFunction<string | null>;
  hasSearch?: boolean;
  hasAdd?: boolean;
}

const ElectronWebtoonAppBar: React.FC<ElectronWebtoonAppBarProps> = ({
  onSearch,
  hasSearch,
  hasAdd,
}) => {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);

  const onSubmitSearch = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onSearch && searchRef.current) {
      onSearch(searchRef.current.value);
    }
  }, []);
  const { messages, pushMessage } = useMessage();

  useEffect(() => {
    async function work() {
      const ipc = await getIPC();
      ipc.onMsg((msg) => {
        pushMessage(msg, 3000);
      });
      ipc.onCompressFile((msg) => {
        pushMessage(msg, 3000);
      });
      ipc.onCompressDone(() => {
        pushMessage("处理完毕", 3000);
        refreshComicList();
      });
    }
    work();
  }, [refreshComicList]);

  const onClickAddFile = useCallback(async () => {
    (await getIPC()).takeCompressAndAddToComic();
  }, []);

  const onClickAddFolder = useCallback(async () => {
    const path = await (await getIPC()).takeDirectory();

    if (!path.canceled && path?.filePaths?.[0]) {
      await (await getIPC()).addComicToLibrary(path.filePaths[0]);
      refreshComicList();
    }
  }, []);

  const [popupVisible, setPopupVisible] = useState(false);
  const onClickAdd = useCallback(() => {
    setPopupVisible(true);
  }, []);

  return (
    <div className="shadow z-10 px-2 fixed top-0 left-0 right-0 bg-white text-black flex justify-center h-[60px] items-center">
      <Typography variant="h6" noWrap>
        <Link to="/">
          ElectronWebtoon<span className="text-[10px]">@{VERSION}</span>
        </Link>
      </Typography>

      <Snackbar
        open={messages.length > 0}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div>
          {messages.map((item) => {
            return (
              <Alert severity="info" key={item.id} className="mt-2">
                {item.msg}
              </Alert>
            );
          })}
        </div>
      </Snackbar>

      {hasSearch && (
        <form
          onSubmit={onSubmitSearch}
          className="border-box transition-all rounded p-1 relative ml-2 hover:border-sky-500 focus-within:border-sky-500 border-gray-200 border"
        >
          <SearchIcon />
          <input
            className="focus:outline-none bg-transparent ml-1"
            ref={searchRef}
            placeholder="Search…"
          />
        </form>
      )}
      <div className="ml-auto flex items-center">
        {hasAdd && (
          <Popup
            visible={popupVisible}
            className="bg-indigo-500 text-white p-2 cursor-pointer rounded transition transition-all active:scale-95 select-none"
            visibleChange={(vis) => setPopupVisible(vis)}
            tooltip={
              <div className="min-w-[150px] h-[50px] bg-gray-500/90 flex text-14 text-white items-center cursor-pointer px-4 whitespace-nowrap rounded">
                <div
                  onClick={onClickAddFile}
                  className="p-2 hover:bg-gray-100/10 hover:text-sky-300 rounded "
                >
                  添加压缩包
                </div>
                <div
                  onClick={onClickAddFolder}
                  className="ml-2 p-2 hover:bg-gray-100/10 hover:text-sky-300 rounded"
                >
                  添加文件夹
                </div>
              </div>
            }
          >
            <div onClick={onClickAdd}>添加本地漫画</div>
          </Popup>
        )}

        <div className="ml-4">
          <Link to="/settings">设置页面</Link>
        </div>
      </div>
    </div>
  );
};

export default ElectronWebtoonAppBar;
