import React, { useRef, useCallback, useEffect, useState } from "react";
import Typography from "@material-ui/core/Typography";
import SearchIcon from "@material-ui/icons/Search";
import { FiberNew } from "@material-ui/icons";
import Alert from "@material-ui/lab/Alert";
import {
  Menu,
  MenuItem,
  Button,
  Snackbar,
} from "@material-ui/core";

import { useRecoilRefresher_UNSTABLE } from "recoil";
import { version } from "../../../package.json";
import * as selector from "../../selector";
import ipc from "../../ipc";

function ElectronWebtoonAppBar({ onSearch }) {
  const searchRef = useRef(null);
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);

  const onSubmitSearch = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    onSearch(searchRef.current.value);
  }, []);

  useEffect(() => {
    async function work() {
      (await ipc).onMsg((msg) => {
        pushMessage(msg, 3000);
      });
      (await ipc).onCompressFile((msg) => {
        pushMessage(msg, 3000);
      });
      (await ipc).onCompressDone(() => {
        pushMessage("处理完毕", 3000);
        refreshComicList();
      });
    }
    work();
  }, [refreshComicList]);

  const onClickAddFile = useCallback(async () => {
    (await ipc).takeCompressAndAddToComic();
  }, []);

  const onClickAddFolder = useCallback(async () => {
    const path = await (await ipc).takeDirectory();

    if (!path.canceled) {
      await (await ipc).addComicToLibrary(path.filePaths[0]);
      refreshComicList();
    }
  }, []);

  const [popupAnchorEl, setPopupAnchorEl] = useState(null);
  const onClickAdd = useCallback((event) => {
    setPopupAnchorEl(event.target);
  }, []);

  const [messages, setMessages] = useState([]);
  const pushMessage = useCallback((msg, ms) => {
    const msgItem = {
      msg,
    };
    setTimeout(() => {
      setMessages((msgs) => {
        console.log("msg:", msgs);
        return msgs.filter((item) => item !== msgItem);
      });
    }, ms);
    setMessages((msgs) => {
      return msgs.concat(msgItem);
    });
  }, []);

  return (
    <div className="shadow z-10 px-2 fixed top-0 left-0 right-0 bg-white text-black flex justify-center h-[60px] items-center">
      <Typography variant="h6" noWrap>
        ElectronWebtoon
        <span className="text-[10px]">@{version}</span>
      </Typography>

      {messages.map((item, index) => {
        return (
          <Snackbar
            open
            key={index}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <Alert severity="info">{item.msg}</Alert>
          </Snackbar>
        );
      })}

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
      <Button
        onClick={onClickAdd}
        startIcon={<FiberNew />}
        color="primary"
        variant="contained"
        className="!ml-auto !mr-[100px]"
      >
        添加本地漫画
      </Button>

      <Menu
        anchorEl={popupAnchorEl}
        keepMounted
        open={!!popupAnchorEl}
        onClose={() => setPopupAnchorEl(null)}
      >
        <MenuItem onClick={onClickAddFile}>添加压缩包</MenuItem>
        <MenuItem onClick={onClickAddFolder}>添加文件夹</MenuItem>
      </Menu>
    </div>
  );
}

export default ElectronWebtoonAppBar;
