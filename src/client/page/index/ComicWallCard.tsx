import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import classNames from "classnames";
import { IComic } from "@shared/type";
import { flattenImgList } from "@shared/flattenImgList";
import { getIPC } from "@client/ipc";
import styles from "./index.module.css";

const PREVIEW_COUNT = 10;
const CAROUSEL_INTERVAL_MS = 380;

const previewCache = new Map<string, string[]>();
const pendingFetches = new Map<string, Promise<string[]>>();

async function loadPreviewImages(comicId: string): Promise<string[]> {
  const cached = previewCache.get(comicId);
  if (cached) {
    return cached;
  }

  let pending = pendingFetches.get(comicId);
  if (!pending) {
    pending = (async () => {
      const ipc = await getIPC();
      const imgList = await ipc.fetchImgList(comicId);
      const urls = flattenImgList(imgList).slice(0, PREVIEW_COUNT);
      previewCache.set(comicId, urls);
      pendingFetches.delete(comicId);
      return urls;
    })();
    pendingFetches.set(comicId, pending);
  }

  return pending;
}

interface ComicWallCardProps {
  comic: IComic;
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
  onContextMenu: (e: MouseEvent<HTMLDivElement>) => void;
}

export default function ComicWallCard({
  comic,
  onClick,
  onContextMenu,
}: ComicWallCardProps) {
  const mountedRef = useRef(true);
  const [hovered, setHovered] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[] | null>(() =>
    previewCache.get(comic.id) ?? null,
  );
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const carouselUrls =
    hovered && previewUrls && previewUrls.length >= 2 ? previewUrls : null;
  const slides = carouselUrls ?? [comic.cover];
  const activeIndex = carouselUrls ? frameIndex % carouselUrls.length : 0;

  useEffect(() => {
    if (!carouselUrls || carouselUrls.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setFrameIndex((index) => (index + 1) % carouselUrls.length);
    }, CAROUSEL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [carouselUrls]);

  const onPointerEnter = useCallback(() => {
    setHovered(true);
    setFrameIndex(0);

    const cached = previewCache.get(comic.id);
    if (cached) {
      setPreviewUrls(cached);
      return;
    }

    loadPreviewImages(comic.id).then((urls) => {
      if (!mountedRef.current) {
        return;
      }
      setPreviewUrls(urls);
    });
  }, [comic.id]);

  const onPointerLeave = useCallback(() => {
    setHovered(false);
    setFrameIndex(0);
  }, []);

  return (
    <div className={styles.cardMat}>
      <div
        className={styles.cardInner}
        data-id={comic.id}
        data-cover={comic.cover}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <div className={styles["card-content"]}>
          {slides.map((url, index) => (
            <img
              key={`${comic.id}-${url}-${index}`}
              src={url}
              alt={comic.name}
              loading="lazy"
              className={classNames(styles.carouselFrame, {
                [styles.carouselFrameActive]: index === activeIndex,
              })}
            />
          ))}
        </div>
        <div className={styles.cardShade} />
        <div className={styles.cardTitle} title={comic.name}>
          {comic.name}
        </div>
      </div>
    </div>
  );
}
