import React, { useCallback, useState } from "react";
import classNames from "classnames";
import { useRecoilRefresher_UNSTABLE } from "recoil";
import { Menu, MenuItem } from "@material-ui/core";
import { Link } from "react-router-dom";

import "../../App.global.css";

import { useHistory } from "react-router-dom";
import { useRecoilState } from "recoil";
import ElectronWebtoonAppBar from "./appbar";
import styles from "./index.css";
import ipc from "../../ipc";
import { useRecoilValueMemo } from "../../utils";
// 展示收藏
function StarBar({ list }) {
  return (
    <div className={styles.starbar}>
      <h1>收藏列表</h1>
      <div className={styles.starlist}>
        {list.map((comic, index) => {
          return (
            <div key={index} className={styles.card} data-id={comic.id}>
              <Link to={`/comic/${comic.id}`}>
                <img alt="" src={comic.cover} width="100%" />
              </Link>
              <div>{comic.name} </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import * as selector from "../../selector";

// css 中一个格子为 200/150, 这里要根据图片尺寸选取合适的格子数量

const GRID_WIDTH = 200;
const GRID_HEIGHT = 150;

const PAIRS = [
  // w, h
  [1, 1],
  [2, 1],
  [3, 1],
  [1, 2],
  [3, 2],
];
function getCardGridStyle(width, height) {
  // ratio = m / n
  const ratio = (width / height) * (GRID_HEIGHT / GRID_WIDTH);
  // 找出最接近 ratio 的 pair
  let minPairIndex = 0;
  let minValue = Infinity;
  for (let pairIndex = 0; pairIndex < PAIRS.length; ++pairIndex) {
    const pair = PAIRS[pairIndex];
    const pairRatio = pair[0] / pair[1];
    if (Math.abs(ratio - pairRatio) < minValue) {
      minValue = Math.abs(ratio - pairRatio);
      minPairIndex = pairIndex;
    }
  }
  const pair = PAIRS[minPairIndex];
  return {
    gridRowStart: "auto",
    gridColumnStart: "auto",
    gridRowEnd: `span ${pair[1]}`,
    gridColumnEnd: `span ${pair[0]}`,
  };
}

function IndexPage() {
  const [showMenu, setShowMenu] = useState(null);
  const [searchKey, setSearchKey] = useState("");
  const comicList = useRecoilValueMemo(selector.comicList);
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);
  const history = useHistory();
  const [_, setNextOpenComicInfo] = useRecoilState(selector.nextOpenComicInfo);

  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    setShowMenu(target);
  }, []);

  const onCloseMenu = useCallback(() => {
    setShowMenu(null);
  }, []);

  const onSubmitSearch = useCallback((value) => {
    setSearchKey(value);
  }, []);

  const onDeleteComic = useCallback(async () => {
    const element = showMenu;
    const { id } = element.dataset;
    await (await ipc).removeComic(id);
    refreshComicList();
    setShowMenu(null);
  }, [showMenu]);

  const onClickItem = useCallback((e) => {
    setNextOpenComicInfo({
      cover: e.currentTarget.dataset.cover,
    });
    history.push(`/comic/${e.currentTarget.dataset.id}`);
  }, []);

  // <StarBar list={comicList} />
  return (
    <div className="pt-[70px] text-black bg-[#eee]">
      <ElectronWebtoonAppBar onSearch={onSubmitSearch} />
      <h1 className="mb-2 text-gray-400">漫画库 {comicList.length}</h1>
      <Menu
        id="simple-menu"
        anchorEl={showMenu}
        keepMounted
        anchorOrigin={{
          vertical: "center",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "center",
          horizontal: "center",
        }}
        open={Boolean(showMenu)}
        onClose={onCloseMenu}
      >
        <MenuItem onClick={onDeleteComic}>Delete</MenuItem>
      </Menu>
      <div className={styles.gridlist}>
        {[...comicList]
          .reverse()
          .filter((comic) => {
            return comic.name.indexOf(searchKey) !== -1;
          })
          .map((comic, index) => {
            const width = comic.width || 1;
            const height = comic.height || 1;
            const cardStyle = getCardGridStyle(width, height);
            return (
              <div
                key={index}
                className={classNames(
                  styles.card,
                  "transition-all duration-750 hover:border-2 border-sky-300 "
                )}
                data-id={comic.id}
                data-cover={comic.cover}
                style={cardStyle}
                onClick={onClickItem}
                onContextMenu={onContextMenu}
              >
                <div className={styles["card-content"]}>
                  <img src={comic.cover} />
                </div>
                <div className="bg-black/50 text-white absolute left-0 right-0 bottom-0 text-center">
                  {comic.name}
                </div>
              </div>
            );
          })}
      </div>
      <div className="text-center pb-[20px] text-black">
        贡献和支持
        <a
          className="ml-2 text-blue-300"
          target="_blank"
          href="https://github.com/Qquanwei/electron-webtoon"
          rel="noreferrer"
        >
          Github
        </a>
      </div>
    </div>
  );
}

export default IndexPage;
