import HorizonFlipBook from "./HorizonFlipBook";
import type { PageFlip } from "page-flip";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import classNames from "classnames";
import useComicContext from "../useComicContext";
import { useFirstElePosition } from "./hooks";
import { useComicReaderLoadingGate } from "./useComicReaderLoadingGate";
import HorizonProgressPreview from "./HorizonProgressPreview";
import {
  buildHorizonSpreads,
  buildMangaFlipOrder,
  flipIndexToSpreadIndex,
  getSpreadIndexForPage,
  getSpreadProgressIndex,
  HORIZON_FLIP_BLUR_CLOSING,
  HORIZON_FLIP_BLUR_OPENING,
  HORIZON_FLIP_PAD_PAGE,
  isHorizonFlipBlurSlot,
  isHorizonFlipPadPage,
  spreadToFlipIndex,
} from "./horizonSpreads";
import {
  flipMangaSpread,
  mapMangaFoldDistPos,
  prepareMangaDragFold,
  revertMangaDragFold,
  type MangaDragFoldPrep,
} from "./mangaPageFlip";
import {
  computeHorizonPageSize,
  loadHorizonPageAspectRatio,
} from "./horizonPageSize";
import type { ImgListProps } from "./types";
import { getComicImageClassName } from "./utils";
import styles from "./HorizonReader.module.css";

import {
  getHorizonFlipBookSettings,
  HORIZON_FLIP_DURATION_MS,
} from "./horizonFlipSettings";

const CLICK_TURN_THRESHOLD = 8;

type TurnDirection = "forward" | "back";

interface BookPoint {
  x: number;
  y: number;
}

interface BookBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  pageWidth: number;
}

function getDistPos(
  clientX: number,
  clientY: number,
  distEl: HTMLElement,
): BookPoint {
  const rect = distEl.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function isWithinBook(distPos: BookPoint, bounds: BookBounds): boolean {
  const bookX = distPos.x - bounds.left;
  const bookY = distPos.y - bounds.top;
  return (
    bookX > 0 && bookY > 0 && bookX < bounds.width && bookY < bounds.height
  );
}

function getBookHalf(
  distPos: BookPoint,
  bounds: BookBounds,
): TurnDirection | null {
  if (!isWithinBook(distPos, bounds)) {
    return null;
  }

  const bookX = distPos.x - bounds.left;
  return bookX <= bounds.width / 2 ? "forward" : "back";
}

function constrainCornerDragPos(
  pos: BookPoint,
  startPos: BookPoint,
  bounds: BookBounds,
): BookPoint {
  const startBookX = startPos.x - bounds.left;
  const midX = bounds.width / 2;
  let x = pos.x;

  if (startBookX <= midX) {
    x = Math.max(startPos.x, pos.x);
  } else {
    x = Math.min(startPos.x, pos.x);
  }

  return { x, y: pos.y };
}

function getFlipPageEdgeClass(pageIndex: number) {
  if (pageIndex === 0) {
    return styles.flipPageEdgeCover;
  }

  return pageIndex % 2 === 1
    ? styles.flipPageEdgeRight
    : styles.flipPageEdgeLeft;
}

interface ComicFlipPageProps {
  src: string;
  pageIndex: number;
  filter?: number;
}

function renderBlurFlipPage(
  ref: React.Ref<HTMLDivElement>,
  src: string,
  filter: number | undefined,
) {
    return (
      <div ref={ref} className={styles.flipPageBlurTail} aria-hidden>
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className={classNames(
            getComicImageClassName(filter, styles.flipPageBlurTailImage),
            styles.flipPageSheetEdge,
          )}
        />
      </div>
    );
}

const ComicFlipPage = forwardRef<HTMLDivElement, ComicFlipPageProps>(
  function ComicFlipPage({ src, pageIndex, filter }, ref) {
    if (isHorizonFlipPadPage(pageIndex)) {
      return <div ref={ref} className={styles.flipPageBlank} aria-hidden />;
    }

    if (pageIndex === HORIZON_FLIP_BLUR_OPENING) {
      return renderBlurFlipPage(ref, src, filter);
    }

    if (pageIndex === HORIZON_FLIP_BLUR_CLOSING) {
      return renderBlurFlipPage(ref, src, filter);
    }

    return (
      <div
        ref={ref}
        className={classNames(styles.flipPage, getFlipPageEdgeClass(pageIndex))}
      >
        <img
          src={src}
          alt=""
          loading={pageIndex === 0 ? "eager" : "lazy"}
          decoding="async"
          data-index={pageIndex}
          className={classNames(
            getComicImageClassName(filter, styles.flipPageImage),
            styles.flipPageSheetEdge,
          )}
        />
      </div>
    );
  },
);

export default function HorizonReader({
  imgList,
  onVisitPosition,
  tag,
}: ImgListProps) {
  const { filter, autoScroll, zoomScale, shortcutHandlersRef } =
    useComicContext();
  const firstElePosition = useFirstElePosition(tag);
  const spreads = useMemo(() => buildHorizonSpreads(imgList), [imgList]);
  const flipOrder = useMemo(
    () => buildMangaFlipOrder(imgList.length),
    [imgList.length],
  );

  const bookRef = useRef<{ pageFlip: () => PageFlip | undefined } | null>(null);
  const bookAreaRef = useRef<HTMLDivElement>(null);
  const spreadIndexRef = useRef(0);
  const cornerDragRef = useRef({
    active: false,
    prepared: false,
    direction: null as TurnDirection | null,
    pos: { x: 0, y: 0 },
    startPos: { x: 0, y: 0 },
  });
  const dragFoldPrepRef = useRef<MangaDragFoldPrep | null>(null);
  const pointerGestureRef = useRef({
    down: false,
    startX: 0,
    startY: 0,
    moved: false,
  });
  const prevFlipStateRef = useRef("read");
  const pendingPageIndexRef = useRef<number | null>(null);

  const [spreadIndex, setSpreadIndex] = useState(() =>
    getSpreadIndexForPage(spreads, firstElePosition),
  );
  const [loading, setLoading] = useState(true);
  const [scrollingDone, setScrollingDone] = useState(false);
  useComicReaderLoadingGate(loading);
  const [animating, setAnimating] = useState(false);
  const [bookSize, setBookSize] = useState<{
    pageWidth: number;
    pageHeight: number;
  } | null>(null);
  const [pageAspectRatio, setPageAspectRatio] = useState<number | null>(null);

  const flipBookSettings = useMemo(() => getHorizonFlipBookSettings(), []);

  spreadIndexRef.current = spreadIndex;

  const flipIndexOfSpread = useCallback(
    (index: number) => spreadToFlipIndex(index, spreads, flipOrder),
    [spreads, flipOrder],
  );

  const getPageFlip = useCallback((): PageFlip | null => {
    return bookRef.current?.pageFlip?.() ?? null;
  }, []);

  const revertDragFoldPrep = useCallback(() => {
    const prep = dragFoldPrepRef.current;
    if (!prep) {
      return;
    }

    const pageFlip = getPageFlip();
    if (pageFlip) {
      revertMangaDragFold(
        pageFlip,
        prep,
        flipIndexOfSpread(prep.previousLogicalSpread),
      );
    }

    setSpreadIndex(prep.previousLogicalSpread);
    dragFoldPrepRef.current = null;
    cornerDragRef.current.prepared = false;
  }, [getPageFlip, flipIndexOfSpread]);

  const prepareDragFold = useCallback(
    (direction: TurnDirection) => {
      const pageFlip = getPageFlip();
      if (!pageFlip || dragFoldPrepRef.current) {
        return false;
      }

      const delta = direction === "forward" ? 1 : -1;
      const nextSpread = spreadIndexRef.current + delta;
      if (nextSpread < 0 || nextSpread >= spreads.length) {
        return false;
      }

      const prep = prepareMangaDragFold(
        pageFlip,
        flipIndexOfSpread(nextSpread),
        spreadIndexRef.current,
        nextSpread,
      );
      if (!prep) {
        return false;
      }

      dragFoldPrepRef.current = prep;
      cornerDragRef.current.prepared = true;
      setSpreadIndex(nextSpread);
      return true;
    },
    [getPageFlip, spreads.length, flipIndexOfSpread],
  );

  const releaseActiveFold = useCallback((pageFlip: PageFlip, pos: BookPoint) => {
      if (pageFlip.getState() !== "user_fold") return;
      pageFlip.userStop(pos);
  }, []);

  useLayoutEffect(() => {
    const area = bookAreaRef.current;
    if (!area || pageAspectRatio === null) return undefined;

    let resizeTimer: number | undefined;

    const updateSize = () => {
      const { width, height } = area.getBoundingClientRect();
      if (width < 120 || height < 120) return;

      const { pageWidth, pageHeight } = computeHorizonPageSize(
        width,
        height,
        pageAspectRatio,
      );
      setBookSize((prev) => {
        if (
          prev?.pageWidth === pageWidth &&
          prev?.pageHeight === pageHeight
        ) {
          return prev;
        }
        return { pageWidth, pageHeight };
      });
    };

    const scheduleUpdateSize = () => {
      if (resizeTimer !== undefined) {
        window.clearTimeout(resizeTimer);
      }
      resizeTimer = window.setTimeout(() => {
        resizeTimer = undefined;
        updateSize();
      }, 150);
    };

    updateSize();
    const observer = new ResizeObserver(scheduleUpdateSize);
    observer.observe(area);
    return () => {
      observer.disconnect();
      if (resizeTimer !== undefined) {
        window.clearTimeout(resizeTimer);
      }
    };
  }, [pageAspectRatio]);

  useEffect(() => {
    if (!imgList.length) {
      setPageAspectRatio(null);
      return undefined;
    }

    let cancelled = false;
    loadHorizonPageAspectRatio(imgList)
      .then((aspectRatio) => {
        if (!cancelled) {
          setPageAspectRatio(aspectRatio);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPageAspectRatio(0.7);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imgList]);

  useEffect(() => {
    setSpreadIndex(getSpreadIndexForPage(spreads, firstElePosition));
  }, [spreads, tag, firstElePosition]);

  const markReady = useCallback(() => {
    setLoading(false);
    window.setTimeout(() => {
      setScrollingDone(true);
    }, 300);
  }, []);

  useEffect(() => {
    setLoading(true);
    setScrollingDone(false);
  }, [imgList]);

  useEffect(() => {
    if (!imgList.length) {
      markReady();
      return undefined;
    }

    const position = Math.min(
      Math.max(firstElePosition, 0),
      imgList.length - 1,
    );
    let cancelled = false;
    const img = new Image();

    const finish = () => {
      if (!cancelled) {
        markReady();
      }
    };

    img.onload = finish;
    img.onerror = finish;
    img.src = imgList[position];

    const timeoutId = window.setTimeout(finish, 3000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [imgList, firstElePosition, markReady]);

  const syncSpreadFromFlip = useCallback(
    (flipPageIndex: number) => {
      setSpreadIndex(
        flipIndexToSpreadIndex(flipPageIndex, flipOrder, imgList.length),
      );
    },
    [flipOrder, imgList.length],
  );

  const turnPage = useCallback(
    (direction: TurnDirection) => {
      if (animating) return;

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      const delta = direction === "forward" ? 1 : -1;
      const nextSpread = spreadIndexRef.current + delta;
      if (nextSpread < 0 || nextSpread >= spreads.length) return;

      flipMangaSpread(
        pageFlip,
        flipIndexOfSpread(nextSpread),
        direction === "forward",
      );
    },
    [animating, getPageFlip, spreads.length, flipIndexOfSpread],
  );

  const goToSpread = useCallback(
    (index: number) => {
      if (animating || index === spreadIndexRef.current) {
        return;
      }

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      const flipPageIndex = flipIndexOfSpread(index);
      pageFlip.turnToPage(flipPageIndex);
      syncSpreadFromFlip(flipPageIndex);
    },
    [animating, getPageFlip, syncSpreadFromFlip, flipIndexOfSpread],
  );

  const turnPageRef = useRef(turnPage);
  turnPageRef.current = turnPage;

  useEffect(() => {
    shortcutHandlersRef.current.turnHorizonPage = (direction) => {
      turnPageRef.current(direction);
    };
    return () => {
      shortcutHandlersRef.current.turnHorizonPage = undefined;
    };
  }, [shortcutHandlersRef]);

  useEffect(() => {
    if (!scrollingDone || !onVisitPosition) return;
    const spread = spreads[spreadIndex];
    if (!spread) return;
    onVisitPosition(getSpreadProgressIndex(spread));
  }, [spreadIndex, scrollingDone, spreads, onVisitPosition]);

  useLayoutEffect(() => {
    if (loading || !bookSize) {
      return;
    }

    const pageFlip = getPageFlip();
    if (!pageFlip) {
      return;
    }

    const targetPage = flipIndexOfSpread(spreadIndexRef.current);
    window.requestAnimationFrame(() => {
      pageFlip.update();
      pageFlip.turnToPage(targetPage);
      syncSpreadFromFlip(targetPage);
    });
  }, [
    loading,
    bookSize,
    imgList,
    tag,
    getPageFlip,
    syncSpreadFromFlip,
    flipIndexOfSpread,
  ]);

  useEffect(() => {
    document.body.classList.add("overflow-y-hidden");
    document.documentElement.classList.add("comic-horizon-reading");

    return () => {
      document.body.classList.remove("overflow-y-hidden");
      document.documentElement.classList.remove("comic-horizon-reading");
      document.documentElement.classList.remove("comic-horizon-flip-animating");
    };
  }, []);

  useEffect(() => {
    const area = bookAreaRef.current;
    if (!area || loading) return undefined;

    function getDistElement() {
      return area.querySelector<HTMLElement>(".stf__block");
    }

    function resetPointerGesture() {
      pointerGestureRef.current.down = false;
      pointerGestureRef.current.moved = false;
    }

    function markPointerMoved(clientX: number, clientY: number) {
      if (!pointerGestureRef.current.down || pointerGestureRef.current.moved) {
        return;
      }

      const dx = clientX - pointerGestureRef.current.startX;
      const dy = clientY - pointerGestureRef.current.startY;
      if (Math.hypot(dx, dy) >= CLICK_TURN_THRESHOLD) {
        pointerGestureRef.current.moved = true;
      }
    }

    function cancelCornerDragFold() {
      if (!cornerDragRef.current.active) {
        return;
      }

      const pageFlip = getPageFlip();
      if (pageFlip?.getState() === "user_fold") {
        const { startPos, direction } = cornerDragRef.current;
        if (direction) {
          const bounds = pageFlip.getBoundsRect();
          const foldPos = mapMangaFoldDistPos(startPos, startPos, bounds, direction);
          pageFlip.userMove(foldPos, false);
          pageFlip.userStop(foldPos);
        } else {
          pageFlip.userMove(startPos, false);
          pageFlip.userStop(startPos);
        }
      }
      cornerDragRef.current.active = false;
      cornerDragRef.current.prepared = false;
      cornerDragRef.current.direction = null;
      revertDragFoldPrep();
    }

    function tryClickTurn(clientX: number, clientY: number) {
      const pageFlip = getPageFlip();
      const distEl = getDistElement();
      if (!pageFlip || !distEl || pageFlip.getState() === "flipping") {
        return;
      }

      const bounds = pageFlip.getBoundsRect();
      const direction = getBookHalf(
        getDistPos(clientX, clientY, distEl),
        bounds,
      );
      if (!direction) {
        return;
      }

      cancelCornerDragFold();
      turnPageRef.current(direction);
    }

    function beginCornerDrag(clientX: number, clientY: number, target: EventTarget | null) {
      const pageFlip = getPageFlip();
      const distEl = getDistElement();
      if (!pageFlip || !distEl || pageFlip.getState() === "flipping") return;
      if (target && !distEl.contains(target as Node)) return;

      const bounds = pageFlip.getBoundsRect();
      const pos = getDistPos(clientX, clientY, distEl);
      const direction = getBookHalf(pos, bounds);
      if (!direction || !prepareDragFold(direction)) return;

      const foldStartPos = mapMangaFoldDistPos(pos, pos, bounds, direction);
      pageFlip.startUserTouch(foldStartPos);
      cornerDragRef.current = {
        active: true,
        prepared: true,
        direction,
        pos,
        startPos: { ...pos },
      };
    }

    function moveCornerDrag(clientX: number, clientY: number) {
      if (!cornerDragRef.current.active) return;

      const pageFlip = getPageFlip();
      const distEl = getDistElement();
      if (!pageFlip || !distEl) return;

      const direction = cornerDragRef.current.direction;
      if (!direction) return;

      const bounds = pageFlip.getBoundsRect();
      const raw = getDistPos(clientX, clientY, distEl);
      const pos = constrainCornerDragPos(
        raw,
        cornerDragRef.current.startPos,
        bounds,
      );
      const foldPos = mapMangaFoldDistPos(
        pos,
        cornerDragRef.current.startPos,
        bounds,
        direction,
      );

      cornerDragRef.current.pos = pos;
      pageFlip.userMove(foldPos, false);
    }

    function endCornerDrag() {
      if (!cornerDragRef.current.active) return;

      const pageFlip = getPageFlip();
      if (!pageFlip) return;

      const { pos, direction, startPos } = cornerDragRef.current;
      cornerDragRef.current.active = false;
      cornerDragRef.current.prepared = false;
      cornerDragRef.current.direction = null;

      if (direction) {
        const bounds = pageFlip.getBoundsRect();
        const foldPos = mapMangaFoldDistPos(pos, startPos, bounds, direction);
        releaseActiveFold(pageFlip, foldPos);
        return;
      }

      releaseActiveFold(pageFlip, pos);
    }

    function onMouseDown(event: MouseEvent) {
      if (event.button !== 0) return;

      pointerGestureRef.current = {
        down: true,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };

      beginCornerDrag(event.clientX, event.clientY, event.target);
      if (cornerDragRef.current.active) {
        event.preventDefault();
      }
    }

    function onMouseMove(event: MouseEvent) {
      markPointerMoved(event.clientX, event.clientY);
      moveCornerDrag(event.clientX, event.clientY);
    }

    function onMouseUp(event: MouseEvent) {
      if (pointerGestureRef.current.down && !pointerGestureRef.current.moved) {
        tryClickTurn(event.clientX, event.clientY);
        resetPointerGesture();
        return;
      }

      endCornerDrag();
      resetPointerGesture();
    }

    function onTouchStart(event: TouchEvent) {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];

      pointerGestureRef.current = {
        down: true,
        startX: touch.clientX,
        startY: touch.clientY,
        moved: false,
      };

      beginCornerDrag(touch.clientX, touch.clientY, event.target);
      if (cornerDragRef.current.active) {
        event.preventDefault();
      }
    }

    function onTouchMove(event: TouchEvent) {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];
      markPointerMoved(touch.clientX, touch.clientY);
      moveCornerDrag(touch.clientX, touch.clientY);
      if (cornerDragRef.current.active) {
        event.preventDefault();
      }
    }

    function onTouchEnd(event: TouchEvent) {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];

      if (pointerGestureRef.current.down && !pointerGestureRef.current.moved) {
        tryClickTurn(touch.clientX, touch.clientY);
        resetPointerGesture();
        return;
      }

      endCornerDrag();
      resetPointerGesture();
    }

    area.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    area.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      area.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      area.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      cornerDragRef.current.active = false;
      cornerDragRef.current.prepared = false;
      resetPointerGesture();
    };
  }, [getPageFlip, loading, releaseActiveFold, prepareDragFold, revertDragFoldPrep]);

  useEffect(() => {
    if (!autoScroll || animating) return undefined;

    const timer = window.setInterval(() => {
      if (animating) return;
      const current = spreadIndexRef.current;
      if (current >= spreads.length - 1) return;
      turnPageRef.current("forward");
    }, HORIZON_FLIP_DURATION_MS + 900);

    return () => window.clearInterval(timer);
  }, [autoScroll, animating, spreads.length]);

  const onFlip = useCallback(
    (event: { data: number }) => {
      pendingPageIndexRef.current = event.data;
      dragFoldPrepRef.current = null;
      cornerDragRef.current.prepared = false;
      syncSpreadFromFlip(event.data);
    },
    [syncSpreadFromFlip],
  );

  const syncFlipMotionClass = useCallback((state: string) => {
    const active =
      state === "flipping" || state === "user_fold" || state === "fold_corner";
    document.documentElement.classList.toggle(
      "comic-horizon-flip-animating",
      active,
    );
  }, []);

  const onChangeState = useCallback(
    (event: { data: string }) => {
      const prevState = prevFlipStateRef.current;
      prevFlipStateRef.current = event.data;
      syncFlipMotionClass(event.data);

      if (event.data === "read" && prevState === "flipping") {
        // 等翻页动画完全收尾后再更新 React，避免 updateFromHtml 打断 99%→100%
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            setAnimating(false);
            const pageFlip = getPageFlip();
            const page =
              pendingPageIndexRef.current ?? pageFlip?.getCurrentPageIndex();
            if (page != null) {
              syncSpreadFromFlip(page);
            }
            pendingPageIndexRef.current = null;
          });
        });
        return;
      }

      if (event.data === "read" && prevState === "user_fold") {
        if (dragFoldPrepRef.current) {
          revertDragFoldPrep();
        }
      }

      setAnimating(event.data === "flipping");
    },
    [getPageFlip, syncSpreadFromFlip, syncFlipMotionClass, revertDragFoldPrep],
  );

  const flipBookPages = useMemo(() => {
    const coverSrc = imgList[0] ?? "";
    const lastPageSrc = imgList[imgList.length - 1] ?? "";

    return flipOrder.map((pageIndex, flipDomIndex) => {
      const src = isHorizonFlipBlurSlot(pageIndex)
        ? pageIndex === HORIZON_FLIP_BLUR_OPENING
          ? lastPageSrc
          : coverSrc
        : isHorizonFlipPadPage(pageIndex)
          ? ""
          : imgList[pageIndex];

      return (
        <ComicFlipPage
          key={
            isHorizonFlipPadPage(pageIndex)
              ? `${tag}-pad-${flipDomIndex}`
              : pageIndex === HORIZON_FLIP_BLUR_OPENING
                ? `${tag}-blur-opening`
                : pageIndex === HORIZON_FLIP_BLUR_CLOSING
                  ? `${tag}-blur-closing`
                  : `${tag}-${pageIndex}-${imgList[pageIndex]}`
          }
          src={src}
          pageIndex={pageIndex}
          filter={filter}
        />
      );
    });
  }, [flipOrder, imgList, tag, filter]);

  const onInit = useCallback(
    (event: { data: { page: number } }) => {
      syncSpreadFromFlip(event.data.page);
    },
    [syncSpreadFromFlip],
  );

  const flipBookZoomStyle = {
    transform: `scale(${zoomScale})`,
    transformOrigin: "center center",
  } as CSSProperties;

  const coverSrc = imgList[0] ?? "";

  if (!imgList.length) {
    return <div className={styles.stage} />;
  }

  return (
    <div className={classNames(styles.stage, "comic-horizon-scroll")}>
      <div className={styles.coverBackdrop} aria-hidden>
        <img
          src={coverSrc}
          alt=""
          className={styles.coverBackdropImage}
          loading="eager"
          decoding="async"
        />
        <div className={styles.coverBackdropDim} />
      </div>
      <div ref={bookAreaRef} className={styles.bookArea}>
        <div className={styles.flipBookZoom} style={flipBookZoomStyle}>
          {bookSize && pageAspectRatio !== null && !loading ? (
            <HorizonFlipBook
              key={`${tag}-${imgList.length}-${bookSize.pageWidth}-${bookSize.pageHeight}`}
              ref={bookRef}
              className={styles.flipBook}
              style={{}}
              width={bookSize.pageWidth}
              height={bookSize.pageHeight}
              size="fixed"
              minWidth={240}
              maxWidth={bookSize.pageWidth}
              minHeight={320}
              maxHeight={bookSize.pageHeight}
              usePortrait={false}
              drawShadow={flipBookSettings.drawShadow}
              flippingTime={flipBookSettings.flippingTime}
              maxShadowOpacity={flipBookSettings.maxShadowOpacity}
              showPageCorners={false}
              disableFlipByClick
              useMouseEvents={false}
              mobileScrollSupport={false}
              startPage={flipIndexOfSpread(spreadIndex)}
              startZIndex={0}
              autoSize
              clickEventForward={false}
              swipeDistance={30}
              onFlip={onFlip}
              onChangeState={onChangeState}
              onInit={onInit}
            >
              {flipBookPages}
            </HorizonFlipBook>
          ) : null}
        </div>
      </div>
      <HorizonProgressPreview
        spreads={spreads}
        spreadIndex={spreadIndex}
        animating={animating}
        onSelect={goToSpread}
      />
    </div>
  );
}
