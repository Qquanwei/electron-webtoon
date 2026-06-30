import React, { useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import {
  useRecoilState,
  useRecoilValue,
  useSetRecoilState,
} from "recoil";
import { flattenImgList } from "@shared/flattenImgList";
import { getIPC } from "./ipc";
import * as selector from "./selector";
import styles from "./startPage.module.css";

const FLY_MS = 720;
const OPEN_MS = 1100;
const EXIT_MS = 420;
const MIN_LOADING_MS = 500;
const TARGET_WIDTH = 280;
const TARGET_RATIO = 4 / 3;

function LoadingCaption() {
  return (
    <p className={styles.caption}>
      加载中
      <span className={styles.dots} aria-hidden>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
    </p>
  );
}

function getTargetSize() {
  const width = Math.min(window.innerWidth * 0.42, TARGET_WIDTH);
  return {
    width,
    height: width * TARGET_RATIO,
  };
}

function getFlyVars(originRect) {
  const target = getTargetSize();
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const originX = originRect.left + originRect.width / 2;
  const originY = originRect.top + originRect.height / 2;
  const scale = Math.max(
    originRect.width / target.width,
    originRect.height / target.height,
  );

  return {
    width: target.width,
    height: target.height,
    flyX: originX - centerX,
    flyY: originY - centerY,
    flyScale: scale,
  };
}

function StartUpPage({ className = "", visible = true }) {
  const nextOpenComicInfo = useRecoilValue(selector.nextOpenComicInfo);
  const [openPhase, setOpenPhase] = useRecoilState(selector.comicOpenPhase);
  const setNextOpenComicInfo = useSetRecoilState(selector.nextOpenComicInfo);
  const cover = nextOpenComicInfo?.cover;
  const comicId = nextOpenComicInfo?.comicId;
  const originRect = nextOpenComicInfo?.originRect;
  const innerPageFromInfo = nextOpenComicInfo?.innerPage;

  const [resolvedInnerPage, setResolvedInnerPage] = useState("");
  const innerPage = innerPageFromInfo || resolvedInnerPage;

  const [mounted, setMounted] = useState(visible);
  const [exiting, setExiting] = useState(false);
  const loadingPhaseStartRef = useRef(null);
  const exitTimerRef = useRef(null);

  const flyVars = useMemo(() => {
    if (!originRect) {
      return null;
    }
    return getFlyVars(originRect);
  }, [originRect]);

  useEffect(() => {
    setResolvedInnerPage("");
  }, [comicId, innerPageFromInfo]);

  useEffect(() => {
    if (innerPageFromInfo || !comicId) {
      return undefined;
    }

    let cancelled = false;

    void (async () => {
      try {
        const ipc = await getIPC();
        const imgList = await ipc.fetchImgList(comicId);
        const pages = flattenImgList(imgList);
        if (!cancelled && pages[1]) {
          setResolvedInnerPage(pages[1]);
        }
      } catch (error) {
        console.warn("open transition inner page fetch failed:", comicId, error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [comicId, innerPageFromInfo]);

  useEffect(() => {
    if (!innerPage) {
      return undefined;
    }

    const img = new Image();
    img.src = innerPage;
    return undefined;
  }, [innerPage]);

  const isTransitioning =
    openPhase === "fly-start" ||
    openPhase === "fly-active" ||
    openPhase === "open-active";
  const hasOpenTransition = Boolean(cover && originRect);
  const showTransitionCover = hasOpenTransition && isTransitioning;
  const showFooter = !showTransitionCover;

  useEffect(() => {
    if (openPhase === "loading") {
      loadingPhaseStartRef.current = Date.now();
    }
  }, [openPhase]);

  useEffect(() => {
    if (!visible || loadingPhaseStartRef.current != null) {
      return;
    }

    if (!hasOpenTransition || openPhase === "loading") {
      loadingPhaseStartRef.current = Date.now();
    }
  }, [hasOpenTransition, openPhase, visible]);

  useEffect(() => {
    if (openPhase === "fly-start") {
      const timer = window.setTimeout(() => {
        setOpenPhase("fly-active");
      }, 32);
      return () => window.clearTimeout(timer);
    }

    if (openPhase === "fly-active") {
      const timer = window.setTimeout(() => {
        setOpenPhase("open-active");
      }, FLY_MS);
      return () => window.clearTimeout(timer);
    }

    if (openPhase === "open-active") {
      const timer = window.setTimeout(() => {
        setOpenPhase("loading");
        setNextOpenComicInfo((prev) =>
          prev
            ? {
                cover: prev.cover,
                innerPage: prev.innerPage,
                comicId: prev.comicId,
              }
            : null,
        );
      }, OPEN_MS);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [openPhase, setNextOpenComicInfo, setOpenPhase]);

  useEffect(() => {
    const clearExitTimer = () => {
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };

    if (visible) {
      clearExitTimer();
      setMounted(true);
      setExiting(false);
      return undefined;
    }

    if (!mounted) {
      return undefined;
    }

    if (isTransitioning) {
      return undefined;
    }

    const started = loadingPhaseStartRef.current ?? Date.now();
    const delay = Math.max(0, MIN_LOADING_MS - (Date.now() - started));

    clearExitTimer();
    exitTimerRef.current = window.setTimeout(() => {
      setExiting(true);
      exitTimerRef.current = window.setTimeout(() => {
        setMounted(false);
        setExiting(false);
        setOpenPhase("idle");
        setNextOpenComicInfo(null);
        loadingPhaseStartRef.current = null;
        exitTimerRef.current = null;
      }, EXIT_MS);
    }, delay);

    return clearExitTimer;
  }, [
    visible,
    mounted,
    isTransitioning,
    openPhase,
    setNextOpenComicInfo,
    setOpenPhase,
  ]);

  if (!mounted) {
    return null;
  }

  const transitionArrived =
    openPhase === "fly-active" || openPhase === "open-active";
  const coverOpening = openPhase === "open-active";

  return (
    <div
      className={classNames(styles.overlay, className, {
        [styles.overlayOut]: exiting,
        [styles.overlayTransition]: hasOpenTransition,
      })}
    >
      {cover ? (
        <>
          <img
            src={cover}
            alt=""
            className={classNames(styles.backdrop, styles.backdropVisible)}
            aria-hidden
          />
          <div className={styles.vignette} aria-hidden />
        </>
      ) : (
        <div className={styles.ambient} aria-hidden />
      )}

      {showTransitionCover && flyVars ? (
        <div
          className={classNames(styles.coverFly, {
            [styles.coverFlyArrived]: transitionArrived,
          })}
          style={{
            width: flyVars.width,
            height: flyVars.height,
            "--fly-x": `${flyVars.flyX}px`,
            "--fly-y": `${flyVars.flyY}px`,
            "--fly-scale": flyVars.flyScale,
          }}
        >
          <div className={styles.bookSpread}>
            <div className={styles.pageReveal} aria-hidden>
              {innerPage ? (
                <img
                  src={innerPage}
                  alt=""
                  className={styles.pageRevealImage}
                  decoding="async"
                />
              ) : null}
            </div>
            <div
              className={classNames(styles.coverLeaf, {
                [styles.coverLeafOpen]: coverOpening,
              })}
            >
              <div className={styles.coverFrame}>
                <img src={cover} alt="" className={styles.coverImage} />
                <div className={styles.coverEdge} aria-hidden />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!cover ? (
        <div className={styles.brandStage}>
          <div className={styles.pageStack} aria-hidden>
            <span className={styles.page} />
            <span className={styles.page} />
            <span className={styles.page} />
          </div>
        </div>
      ) : null}

      {showFooter ? (
        <div className={classNames(styles.footer, styles.footerVisible)}>
          <div className={styles.progressTrack} aria-hidden>
            <div className={styles.progressBar} />
          </div>
          <LoadingCaption />
        </div>
      ) : null}
    </div>
  );
}

export default StartUpPage;
