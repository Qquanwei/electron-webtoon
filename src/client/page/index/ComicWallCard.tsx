import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import classNames from "classnames";
import { IComic, IImgList } from "@shared/type";
import { flattenImgList } from "@shared/flattenImgList";
import { getComicReadProgressPercent } from "@shared/comicReadProgress";
import { getIPC } from "@client/ipc";
import styles from "./index.module.css";

const PREVIEW_COUNT = 10;
const CAROUSEL_INTERVAL_MS = 520;
const CAROUSEL_FADE_MS = 480;

const previewCache = new Map<string, string[]>();
const imgListCache = new Map<string, IImgList>();
const progressCache = new Map<string, number>();
const pendingFetches = new Map<string, Promise<string[]>>();
const pendingImgListFetches = new Map<string, Promise<IImgList>>();

async function loadComicImgList(comicId: string): Promise<IImgList> {
  const cached = imgListCache.get(comicId);
  if (cached) {
    return cached;
  }

  let pending = pendingImgListFetches.get(comicId);
  if (!pending) {
    pending = (async () => {
      const ipc = await getIPC();
      const imgList = await ipc.fetchImgList(comicId);
      imgListCache.set(comicId, imgList);
      pendingImgListFetches.delete(comicId);
      return imgList;
    })();
    pendingImgListFetches.set(comicId, pending);
  }

  return pending;
}

function getProgressCacheKey(comic: IComic) {
  return `${comic.id}:${comic.tag || ""}:${comic.position ?? 0}`;
}

async function loadComicProgress(comic: IComic): Promise<number> {
  const cacheKey = getProgressCacheKey(comic);
  const cached = progressCache.get(cacheKey);
  if (cached != null) {
    return cached;
  }

  const imgList = await loadComicImgList(comic.id);
  const percent = getComicReadProgressPercent(comic, imgList);
  progressCache.set(cacheKey, percent);
  return percent;
}

async function preloadImages(urls: string[]) {
  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  );
}

async function loadPreviewImages(comicId: string): Promise<string[]> {
  const cached = previewCache.get(comicId);
  if (cached) {
    return cached;
  }

  let pending = pendingFetches.get(comicId);
  if (!pending) {
    pending = (async () => {
      const imgList = await loadComicImgList(comicId);
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[] | null>(() =>
    previewCache.get(comic.id) ?? null,
  );
  const [frameIndex, setFrameIndex] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) {
      return undefined;
    }

    let cancelled = false;

    const loadProgress = () => {
      void loadComicProgress(comic).then((percent) => {
        if (!cancelled && mountedRef.current) {
          setProgressPercent(percent);
        }
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      loadProgress();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }
        observer.disconnect();
        loadProgress();
      },
      { rootMargin: "120px" },
    );

    observer.observe(card);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [comic.id, comic.tag, comic.position]);

  const carouselUrls =
    hovered && previewUrls && previewUrls.length >= 2 ? previewUrls : null;
  const carouselActive =
    Boolean(carouselUrls && imagesReady) && carouselUrls!.length >= 2;
  const activeIndex = carouselActive
    ? frameIndex % carouselUrls!.length
    : 0;

  useEffect(() => {
    if (!carouselUrls?.length) {
      setImagesReady(false);
      return undefined;
    }

    let cancelled = false;
    setImagesReady(false);
    setFrameIndex(0);

    void preloadImages(carouselUrls).then(() => {
      if (!cancelled && mountedRef.current) {
        setImagesReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [carouselUrls]);

  useEffect(() => {
    if (!carouselActive || !carouselUrls) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setFrameIndex((index) => (index + 1) % carouselUrls.length);
    }, CAROUSEL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [carouselActive, carouselUrls]);

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
    setImagesReady(false);
  }, []);

  const contentStyle = {
    "--carousel-fade-ms": `${CAROUSEL_FADE_MS}ms`,
  } as CSSProperties;

  return (
    <div ref={cardRef} className={styles.cardMat}>
      <div
        className={styles.cardInner}
        data-id={comic.id}
        data-cover={comic.cover}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <div className={styles["card-content"]} style={contentStyle}>
          {carouselActive
            ? carouselUrls!.map((url, index) => (
                <img
                  key={url}
                  src={url}
                  alt={comic.name}
                  loading="lazy"
                  decoding="async"
                  className={classNames(styles.carouselFrame, {
                    [styles.carouselFrameActive]: index === activeIndex,
                  })}
                />
              ))
            : (
              <img
                key={comic.cover}
                src={comic.cover}
                alt={comic.name}
                loading="lazy"
                decoding="async"
                className={classNames(
                  styles.carouselFrame,
                  styles.carouselFrameActive,
                )}
              />
            )}
        </div>
        <div className={styles.cardShade} />
        {progressPercent != null ? (
          <div className={styles.cardProgress} aria-label={`阅读进度 ${progressPercent}`}>
            {progressPercent}
          </div>
        ) : null}
        <div className={styles.cardTitle} title={comic.name}>
          {comic.name}
        </div>
      </div>
    </div>
  );
}
