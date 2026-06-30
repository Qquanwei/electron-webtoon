import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { useRecoilRefresher_UNSTABLE } from "recoil";
import { Link, useHistory } from "react-router-dom";
import { useRecoilState, useSetRecoilState, useRecoilCallback } from "recoil";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import ElectronWebtoonAppBar from "../../components/appbar";
import Popup from "@components/Popup";
import { useMessage } from "@components/useMessage";
import styles from "./index.module.css";
import { useRecoilValueMemo } from "../../utils";
import * as selector from "../../selector";
import { getIPC } from "@client/ipc";
import ComicWallCard from "./ComicWallCard";
import { getFrameVariant } from "./frameVariant";

import "../../App.global.css";

const GRID_WIDTH = 200;
const GRID_HEIGHT = 150;
const COLLAPSE_DEFAULT_THRESHOLD = 10;

const PAIRS = [
  [1, 1],
  [2, 1],
  [3, 1],
  [1, 2],
  [3, 2],
];

function getCardGridStyle(width: number, height: number) {
  const ratio = (width / height) * (GRID_HEIGHT / GRID_WIDTH);
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
  const [archivePath, setArchivePath] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const navDefaultAppliedRef = useRef(false);
  const comicList = useRecoilValueMemo(selector.comicList);
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);
  const history = useHistory();
  const [_, setNextOpenComicInfo] = useRecoilState(selector.nextOpenComicInfo);
  const setComicOpenPhase = useSetRecoilState(selector.comicOpenPhase);
  const prefetchComicDetail = useRecoilCallback(
    ({ snapshot }) =>
      (comicId: string) => {
        void snapshot.getLoadable(selector.comicDetail(comicId)).toPromise();
      },
    [],
  );
  const { pushMessage } = useMessage();

  const filteredComics = useMemo(() => {
    return [...comicList!]
      .reverse()
      .filter((comic) => comic.name.includes(searchKey));
  }, [comicList, searchKey]);

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

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setContextComicId(e.currentTarget?.dataset?.id || null);
  }, []);

  const onSubmitSearch = useCallback((value: string | null) => {
    setSearchKey(value || "");
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
          (error as Error)?.message || "归档失败，请检查路径和权限";
        pushMessage(errorMsg, 2000);
      }
    }
    setContextComicId(null);
  }, [contextComicId, refreshComicList, pushMessage]);

  const onClickItem = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();

      if (target.dataset.cover && target.dataset.id) {
        setComicOpenPhase("fly-start");
        setNextOpenComicInfo({
          cover: target.dataset.cover,
          originRect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
        });
        prefetchComicDetail(target.dataset.id);
      }
      history.push(`/comic/${target.dataset.id}`);
    },
    [history, prefetchComicDetail, setComicOpenPhase, setNextOpenComicInfo],
  );

  useEffect(() => {
    if (!comicList || navDefaultAppliedRef.current) {
      return;
    }

    navDefaultAppliedRef.current = true;
    if (comicList.length > COLLAPSE_DEFAULT_THRESHOLD) {
      setNavCollapsed(true);
    }
  }, [comicList]);

  useEffect(() => {
    refreshComicList();
    setComicOpenPhase("idle");
    setNextOpenComicInfo(null);
  }, [refreshComicList, setComicOpenPhase, setNextOpenComicInfo]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.scrollingElement?.classList.add("overflow-x-hidden");
    return () => {
      document.scrollingElement?.classList.remove("overflow-x-hidden");
    };
  }, []);

  const onToggleNav = useCallback(() => {
    setNavCollapsed((collapsed) => !collapsed);
  }, []);

  return (
    <div
      className={classNames(styles.pageRoot, {
        [styles.pageCollapsed]: navCollapsed,
        [styles.pageExpanded]: !navCollapsed,
      })}
    >
      <div
        className={classNames(styles.navShell, {
          [styles.navShellCollapsed]: navCollapsed,
        })}
      >
        <ElectronWebtoonAppBar
          embedded
          hasAdd
          hasSearch
          onSearch={onSubmitSearch}
        />
      </div>

      <button
        type="button"
        className={classNames(styles.bookmarkTab, {
          [styles.bookmarkTabExpanded]: !navCollapsed,
        })}
        onClick={onToggleNav}
        aria-label={navCollapsed ? "展开导航栏" : "收起导航栏"}
        aria-expanded={!navCollapsed}
      >
        <DragHandleIcon className={styles.bookmarkIcon} fontSize="small" />
      </button>

      <div className="w-full">
        <header
          className={classNames(styles.libraryHeader, {
            [styles.libraryHeaderCollapsed]: navCollapsed,
          })}
        >
          <h1 className="flex flex-wrap items-baseline gap-x-2">
            <span className={styles.libraryTitle}>漫画库</span>
            <span className={styles.libraryMeta}>
              {comicList!.length} 部作品
              {searchKey ? (
                <span className={styles.librarySearchHint}>
                  {" "}
                  · 搜索「{searchKey}」
                </span>
              ) : null}
            </span>
          </h1>
        </header>

        <div className={styles.gridlist}>
          {filteredComics.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>
                {searchKey ? "没有匹配的漫画" : "书架还是空的"}
              </p>
              <p className={styles.emptyStateHint}>
                {searchKey
                  ? "试试换个关键词，或清空搜索框查看全部作品。"
                  : "点击右上角添加本地漫画，或将压缩包/文件夹拖入窗口。"}
              </p>
            </div>
          ) : (
            filteredComics.map((comic) => {
              const width = comic.width || 1;
              const height = comic.height || 1;
              const cardStyle = getCardGridStyle(width, height);

              const variant = getFrameVariant(comic.id);

              return (
                <Popup
                  key={comic.id}
                  position="center"
                  style={cardStyle}
                  className={classNames(styles.card, styles[`frame_${variant}`])}
                  visibleChange={() => setContextComicId(null)}
                  visible={contextComicId === comic.id}
                  tooltip={
                    <div className="flex min-w-[128px] flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-300/30">
                      <div
                        onClick={onDeleteComic}
                        className="cursor-pointer px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
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
                        className={classNames(
                          "px-4 py-2.5 text-sm font-medium transition-colors",
                          archivePath
                            ? "cursor-pointer text-orange-600 hover:bg-orange-50"
                            : "cursor-not-allowed text-slate-400 opacity-60",
                        )}
                        title={
                          archivePath
                            ? "归档此漫画"
                            : "请先在设置页面配置归档路径"
                        }
                      >
                        归档
                      </div>
                      <div
                        className="cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        onClick={() => setContextComicId(null)}
                      >
                        取消
                      </div>
                    </div>
                  }
                >
                  <ComicWallCard
                    comic={comic}
                    onClick={onClickItem}
                    onContextMenu={onContextMenu}
                  />
                </Popup>
              );
            })
          )}
        </div>

        <footer className={styles.pageFooter}>
          贡献与支持
          <a
            className={styles.pageFooterLink}
            target="_blank"
            href="https://github.com/Qquanwei/electron-webtoon"
            rel="noreferrer"
          >
            GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}

export default IndexPage;
