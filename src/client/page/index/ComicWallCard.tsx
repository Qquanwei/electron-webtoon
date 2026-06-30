import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import classNames from "classnames";
import { IComic } from "@shared/type";
import { flattenImgList } from "@shared/flattenImgList";
import { getIPC } from "@client/ipc";
import styles from "./index.module.css";

const CAROUSEL_INTERVAL_MS = 520;
const CAROUSEL_FADE_MS = 480;
const HOVER_PREVIEW_COUNT = 10;
const SWEEP_DURATION_MS = 900;
const CARD_TILT_MAX_DEG = 4;
const CARD_HOVER_LIFT_PX = 3;
const CARD_HOVER_SCALE = 1.02;

function clampTilt(value: number, maxDeg: number) {
  return Math.max(-maxDeg, Math.min(maxDeg, value));
}

function tiltFromPointerOffset(offset: number, maxDeg: number) {
  const normalized = offset * 2;
  const curved =
    Math.sign(normalized) * Math.pow(Math.abs(normalized), 1.45);
  return clampTilt(curved * maxDeg, maxDeg);
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
  const cardMatRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);
  const [fetchedPreviewUrls, setFetchedPreviewUrls] = useState<string[]>([]);
  const [sweepDone, setSweepDone] = useState(false);
  const [sweepKey, setSweepKey] = useState(0);

  const storedPreviewUrls = useMemo(
    () => comic.previewUrls?.filter(Boolean) ?? [],
    [comic.previewUrls],
  );
  const progressPercent = comic.readProgressPercent ?? 0;
  const previewUrls = useMemo(
    () =>
      storedPreviewUrls.length >= 2 ? storedPreviewUrls : fetchedPreviewUrls,
    [fetchedPreviewUrls, storedPreviewUrls],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!hovered || storedPreviewUrls.length >= 2) {
      setFetchedPreviewUrls([]);
      return undefined;
    }

    let cancelled = false;

    void (async () => {
      try {
        const ipc = await getIPC();
        const imgList = await ipc.fetchImgList(comic.id);
        const urls = flattenImgList(imgList)
          .filter(Boolean)
          .slice(0, HOVER_PREVIEW_COUNT);

        if (!cancelled && mountedRef.current && urls.length >= 2) {
          setFetchedPreviewUrls(urls);
        }
      } catch (error) {
        console.warn("hover preview fetch failed:", comic.id, error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [comic.id, hovered, storedPreviewUrls.length]);

  const carouselUrls = useMemo(
    () => (hovered && previewUrls.length >= 2 ? previewUrls : null),
    [hovered, previewUrls],
  );
  const carouselActive =
    Boolean(carouselUrls && imagesReady && sweepDone) &&
    carouselUrls!.length >= 2;
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

  useEffect(() => {
    if (!hovered) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (mountedRef.current) {
        setSweepDone(true);
      }
    }, SWEEP_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hovered, sweepKey]);

  const getTiltTarget = useCallback(() => {
    return cardMatRef.current?.parentElement ?? null;
  }, []);

  const updateCardTilt = useCallback(
    (clientX: number, clientY: number) => {
      const target = getTiltTarget();
      if (!target) {
        return;
      }

      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const px = (clientX - rect.left) / rect.width - 0.5;
      const py = (clientY - rect.top) / rect.height - 0.5;
      const rotateY = tiltFromPointerOffset(px, CARD_TILT_MAX_DEG);
      const rotateX = tiltFromPointerOffset(-py, CARD_TILT_MAX_DEG);

      target.style.transform = `perspective(2000px) translate3d(0, -${CARD_HOVER_LIFT_PX}px, 0) scale(${CARD_HOVER_SCALE}) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    },
    [getTiltTarget],
  );

  const resetCardTilt = useCallback(() => {
    const target = getTiltTarget();
    if (!target) {
      return;
    }
    target.style.transform = "";
  }, [getTiltTarget]);

  const onPointerEnter = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      setHovered(true);
      setSweepDone(false);
      setSweepKey((key) => key + 1);
      setFrameIndex(0);
      updateCardTilt(event.clientX, event.clientY);
    },
    [updateCardTilt],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      updateCardTilt(event.clientX, event.clientY);
    },
    [updateCardTilt],
  );

  const onPointerLeave = useCallback(() => {
    setHovered(false);
    setSweepDone(false);
    setFrameIndex(0);
    setImagesReady(false);
    setFetchedPreviewUrls([]);
    resetCardTilt();
  }, [resetCardTilt]);

  const onSweepEnd = useCallback(() => {
    setSweepDone(true);
  }, []);

  const contentStyle = {
    "--carousel-fade-ms": `${CAROUSEL_FADE_MS}ms`,
  } as CSSProperties;

  const sweepStyle = {
    "--card-sweep-ms": `${SWEEP_DURATION_MS}ms`,
  } as CSSProperties;

  return (
    <div
      ref={cardMatRef}
      className={styles.cardMat}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div
        className={styles.cardInner}
        data-id={comic.id}
        data-cover={comic.cover}
        data-inner-page={storedPreviewUrls[1] ?? ""}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        <div className={styles["card-content"]} style={contentStyle}>
          {carouselActive
            ? carouselUrls!.map((url, index) => (
                <img
                  key={`${url}-${index}`}
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
        {hovered ? (
          <div
            className={styles.cardSweep}
            key={sweepKey}
            style={sweepStyle}
            aria-hidden
          >
            <span className={styles.cardSweepBeam} onAnimationEnd={onSweepEnd} />
          </div>
        ) : null}
        <div className={styles.cardShade} />
        <div className={styles.cardProgress} aria-label={`阅读进度 ${progressPercent}`}>
          {progressPercent}
        </div>
        <div className={styles.cardTitle} title={comic.name}>
          {comic.name}
        </div>
      </div>
    </div>
  );
}
