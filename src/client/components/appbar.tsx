import React, { useRef, useCallback, useState } from "react";
import classNames from "classnames";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { Link } from "react-router-dom";
import { useRecoilRefresher_UNSTABLE } from "recoil";
import * as selector from "../selector";
import { getIPC } from "../ipc";
import { UnaryFunction } from "../../shared/type";
import Popup from "./Popup";
import styles from "./appbar.module.css";

interface ElectronWebtoonAppBarProps {
  onSearch?: UnaryFunction<string | null>;
  hasSearch?: boolean;
  hasAdd?: boolean;
  /** 嵌入首页可收起导航时使用，避免 fixed 脱离父容器 */
  embedded?: boolean;
}

const ElectronWebtoonAppBar: React.FC<ElectronWebtoonAppBarProps> = ({
  onSearch,
  hasSearch,
  hasAdd,
  embedded = false,
}) => {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);

  const onSubmitSearch = useCallback(
    (e: React.FormEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (onSearch && searchRef.current) {
        onSearch(searchRef.current.value);
      }
    },
    [onSearch],
  );

  const onClickAddFile = useCallback(async () => {
    (await getIPC()).takeCompressAndAddToComic();
  }, []);

  const onClickAddFolder = useCallback(async () => {
    const path = await (await getIPC()).takeDirectory();

    if (!path.canceled && path?.filePaths?.[0]) {
      await (await getIPC()).addComicToLibrary(path.filePaths[0]);
      refreshComicList();
    }
  }, [refreshComicList]);

  const [popupVisible, setPopupVisible] = useState(false);
  const onClickAdd = useCallback(() => {
    setPopupVisible(true);
  }, []);

  return (
    <header
      className={classNames(styles.bar, {
        [styles.barEmbedded]: embedded,
        [styles.barFixed]: !embedded,
      })}
    >
      <Link to="/" className={styles.brand}>
        <span className={styles.brandText}>
          <span className={styles.brandTitle}>
            ElectronWebtoon
            <span className={styles.brandVersion}>v{VERSION}</span>
          </span>
          <span className={styles.brandSubtitle}>本地漫画库</span>
        </span>
      </Link>

      {hasSearch ? (
        <form onSubmit={onSubmitSearch} className={styles.searchForm}>
          <SearchIcon className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            ref={searchRef}
            placeholder="搜索漫画…"
            aria-label="搜索漫画"
          />
        </form>
      ) : null}

      <div className={styles.actions}>
        {hasAdd ? (
          <Popup
            visible={popupVisible}
            className={styles.addButton}
            visibleChange={(vis) => setPopupVisible(vis)}
            tooltip={
              <div className={styles.addMenu}>
                <div className={styles.addMenuItem} onClick={onClickAddFile}>
                  添加压缩包
                </div>
                <div className={styles.addMenuItem} onClick={onClickAddFolder}>
                  添加文件夹
                </div>
              </div>
            }
          >
            <div className="flex items-center gap-1.5" onClick={onClickAdd}>
              <AddIcon className={styles.addIcon} />
              <span>添加漫画</span>
            </div>
          </Popup>
        ) : null}

        <Link to="/settings" className={styles.settingsLink}>
          <SettingsOutlinedIcon className={styles.settingsIcon} />
          <span>设置</span>
        </Link>
      </div>
    </header>
  );
};

export default ElectronWebtoonAppBar;
