/* eslint-disable */
import React, { useCallback, useEffect } from 'react';
import classNames from 'classnames';
import Filter1Icon from '@material-ui/icons/Filter1';
import Filter2Icon from '@material-ui/icons/Filter2';
import Filter3Icon from '@material-ui/icons/Filter3';
import Filter4Icon from '@material-ui/icons/Filter4';
import SettingIcon from '@material-ui/icons/Settings';
import ArrowCircleDown from '@material-ui/icons/ArrowDownward';
import AddAPhotoIcon from '@material-ui/icons/AddAPhoto';
import { useRecoilRefresher_UNSTABLE } from 'recoil';
import HomeIcon from '@material-ui/icons/Home';
import { Tooltip } from '@material-ui/core';
import { useHistory } from 'react-router-dom';
import * as  selector from '../../selector';
import useComicContext from './useComicContext';

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

  const onClickAdd = useCallback(() => {

  }, []);

  return (
    <div className="fixed right-0 bottom-[20px] flex flex-col justify-end cursor-pointer px-[20px]">
      <Tooltip title="滤镜1" placement='top'>
        <Filter1Icon
          className={classNames("bg-[#333] text-white", {
            ["text-orange-300"]: filter === 1,
          })}
          onClick={() => onClickFilter(1)}
        /></Tooltip>

      <Tooltip title="滤镜2" placement='top'>
        <Filter2Icon
          className={classNames("bg-[#333] text-white mt-[10px]", {
            ["text-orange-300"]: filter === 2,
          })}
          onClick={() => onClickFilter(2)}
        />
      </Tooltip>
      <Tooltip title="滤镜3" placement='top'>
        <Filter3Icon
          className={classNames("bg-[#333] text-white mt-[10px]", {
            ["text-orange-300"]: filter === 3,
          })}
          onClick={() => onClickFilter(3)}
        />
      </Tooltip>

      <Tooltip title="滤镜4" placement='top'>
        <Filter4Icon
          className={classNames("bg-[#333] text-white mt-[10px]", {
            ["text-orange-300"]: filter === 4,
          })}
          onClick={() => onClickFilter(4)}
        />
      </Tooltip>
      <div title="收藏" className={classNames(["text-orange-300"], 'hidden')} onClick={onClickAdd}>
        <AddAPhotoIcon></AddAPhotoIcon>
      </div>
      <Tooltip title="自动滚动" placement='top'>
        <ArrowCircleDown
          className={classNames("bg-[#333] text-white mt-[10px]", {
            ["text-orange-300"]: autoScroll,
          })}
          onClick={() => setAutoScroll((v) => !v)}
        />
      </Tooltip>

      <Tooltip title="回到主页" placement='top'>
        <HomeIcon className={"bg-[#333] text-white mt-[10px]"} onClick={onClickHome}>
          Home
        </HomeIcon>
      </Tooltip>

      {children}
    </div>
  );
}

export default Control;
