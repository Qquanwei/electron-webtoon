import { useCallback, useEffect, useState } from "react";
import classNames from "classnames";
import { useRecoilRefresher_UNSTABLE } from "recoil";
import { Link } from "react-router-dom";

import "../../App.global.css";

import { useHistory } from "react-router-dom";
import { useRecoilState } from "recoil";
import ElectronWebtoonAppBar from "../../components/appbar";
import Popup from "@components/Popup";
import { useMessage } from "@components/useMessage";
import styles from "./index.module.css";
import { useRecoilValueMemo } from "../../utils";

import * as selector from "../../selector";
import { getIPC } from "@client/ipc";

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
function getCardGridStyle(width: number, height: number) {
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
  const [contextComicId, setContextComicId] = useState<string | null>(null);
  const [archivePath, setArchivePath] = useState<string>("");
  const [searchKey, setSearchKey] = useState("");
  const comicList = useRecoilValueMemo(selector.comicList);
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);
  const history = useHistory();
  const [_, setNextOpenComicInfo] = useRecoilState(selector.nextOpenComicInfo);
  const { pushMessage } = useMessage();

  useEffect(() => {
    let mounted = true;
    async function loadArchivePath() {
      const ipc = await getIPC();
      const value = await ipc.get("archivePath");
      if (mounted && value) {
        setArchivePath(value as string);
      }
    }
    loadArchivePath();
    return () => {
      mounted = false;
    };
  }, []);

  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextComicId(e.currentTarget?.dataset?.id);
  }, []);

  const onSubmitSearch = useCallback((value) => {
    setSearchKey(value);
  }, []);

  const onDeleteComic = useCallback(async () => {
    const ipc = await getIPC();
    if (contextComicId) {
      await ipc.removeComic(contextComicId);
      refreshComicList();
    }

    setContextComicId(null);
  }, [contextComicId, refreshComicList]);

  const onArchiveComic = useCallback(async () => {
    const ipc = await getIPC();
    if (contextComicId) {
      try {
        await ipc.archiveComic(contextComicId);
        refreshComicList();
      } catch (error) {
        console.error("Archive error:", error);
        const errorMsg =
          (error as any)?.message || "归档失败，请检查路径和权限";
        pushMessage(errorMsg, 2000);
      }
    }

    setContextComicId(null);
  }, [contextComicId, refreshComicList, pushMessage]);

  const onClickItem = useCallback((e) => {
    if (e.currentTarget.dataset.cover) {
      setNextOpenComicInfo({
        cover: e.currentTarget.dataset.cover,
      });
    }

    history.push(`/comic/${e.currentTarget.dataset.id}`);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.scrollingElement?.classList.add("overflow-x-hidden");
    return () => {
      document.scrollingElement?.classList.remove("overflow-x-hidden");
    };
  }, []);

  // <StarBar list={comicList} />
  return (
    <div className="pt-[70px] text-black bg-[#eee] w-full min-h-full scroll-smooth">
      <ElectronWebtoonAppBar hasAdd hasSearch onSearch={onSubmitSearch} />
      <h1 className="mb-2 text-gray-400">漫画库 {comicList!.length}</h1>

      <div className={styles.gridlist}>
        {[...comicList!]
          .reverse()
          .filter((comic) => {
            return comic.name.indexOf(searchKey) !== -1;
          })
          .map((comic) => {
            const width = comic.width || 1;
            const height = comic.height || 1;
            const cardStyle = getCardGridStyle(width, height);
            return (
              <Popup
                position="center"
                style={cardStyle}
                className={classNames(
                  styles.card,
                  "transition-all duration-750 hover:border-2 border-sky-300 ",
                )}
                visibleChange={() => setContextComicId(null)}
                visible={contextComicId === comic.id}
                tooltip={
                  <div className="flex flex-col bg-white divide-y divide-gray-100 cursor-pointer shadow-md rounded-md overflow-hidden min-w-[120px]">
                    <div
                      onClick={onDeleteComic}
                      className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                    >
                      删除本漫画
                    </div>
                    <div
                      onClick={
                        archivePath
                          ? onArchiveComic
                          : () =>
                              pushMessage("请先在设置页面配置归档路径", 2000)
                      }
                      className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                        archivePath
                          ? "text-orange-600 hover:bg-orange-50 cursor-pointer"
                          : "text-gray-400 cursor-not-allowed opacity-60"
                      }`}
                      title={
                        archivePath
                          ? "归档此漫画"
                          : "请先在设置页面配置归档路径"
                      }
                    >
                      归档
                    </div>
                    <div
                      className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                      onClick={() => setContextComicId(null)}
                    >
                      取消
                    </div>
                  </div>
                }
                key={comic.id}
              >
                <div
                  data-id={comic.id}
                  data-cover={comic.cover}
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
              </Popup>
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
