import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  type RefObject,
  type SyntheticEvent,
} from "react";
import { createEventListener } from "tiny-event-manager";
import useComicContext from "../useComicContext";
import { EmptyFunction, UnaryFunction } from "@shared/type";

export function useFirstElePosition(tag?: string) {
  const { comic } = useComicContext();

  return useMemo(() => {
    if (!comic) return 0;
    if (tag && comic.tag && comic.tag !== tag) return 0;
    if (Number.isInteger(comic.position) && comic.position) {
      return Number(comic.position);
    }
    return 0;
  }, [comic, tag]);
}

export function useReadingReadyState(
  imgList: string[],
  firstElePosition: number,
  containerRef: RefObject<Element | null>,
  onReady?: EmptyFunction,
) {
  const [loading, setLoading] = useState(true);
  const [scrollingDone, setScrollingDone] = useState(false);
  const containerRefValue = useRef(containerRef);
  containerRefValue.current = containerRef;
  const firstElePositionRef = useRef(firstElePosition);
  firstElePositionRef.current = firstElePosition;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const markReady = useCallback(() => {
    setLoading(false);
    setTimeout(() => {
      setScrollingDone(true);
    }, 500);
  }, []);

  useEffect(() => {
    if (firstElePosition < 0 || firstElePosition > imgList.length) {
      markReady();
    }
  }, [firstElePosition, imgList.length, markReady]);

  useEffect(() => {
    setLoading(true);
    setScrollingDone(false);
  }, [imgList]);

  const onLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    if (
      Number(event.currentTarget.dataset.index) !== firstElePositionRef.current
    ) {
      return;
    }

    const target = event.currentTarget;
    const container = containerRefValue.current.current;

    if (container) {
      container.classList.add("scroll-smooth");
    }
    markReady();

    setTimeout(() => {
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, 50);

    setTimeout(() => {
      container?.classList.remove("scroll-smooth");
    }, 100);
  }, [markReady]);

  return { loading, scrollingDone, onLoad };
}

export function useWatchComicPositionChange(
  imgList: string[],
  enabled: boolean,
  onVisiblePosition?: UnaryFunction<number>,
) {
  const onVisitPositionRef = useRef(onVisiblePosition);
  onVisitPositionRef.current = onVisiblePosition;

  useEffect(() => {
    if (!enabled || !onVisiblePosition) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry.intersectionRatio &&
          onVisitPositionRef.current &&
          !entry.isIntersecting
        ) {
          const position = Number(
            (entry.target as HTMLImageElement).dataset.index,
          );
          if (position > 0) {
            onVisitPositionRef.current(position);
          }
        }
      },
      { threshold: [0.8] },
    );

    document.querySelectorAll(".comic-img").forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [enabled, imgList, onVisiblePosition]);
}

export function useVerticalScrollLock() {
  useLayoutEffect(() => {
    document.scrollingElement?.classList.add("overflow-x-hidden");
    return () => {
      document.scrollingElement?.classList.remove("overflow-x-hidden");
    };
  }, []);
}

export function useHorizontalScrollLock() {
  useEffect(() => {
    document.body.classList.add("overflow-y-hidden");

    const scrollingElement = document.scrollingElement;
    if (!scrollingElement) {
      return () => {
        document.body.classList.remove("overflow-y-hidden");
      };
    }

    const subscription = createEventListener(
      scrollingElement,
      "wheel",
      (event: WheelEvent) => {
        const container = document.querySelector<HTMLElement>(
          ".comic-horizon-scroll",
        );
        if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL || !container) {
          return;
        }
        container.scrollBy({ top: 0, left: -event.deltaY });
      },
    );

    return () => {
      subscription.unsubscribe();
      document.body.classList.remove("overflow-y-hidden");
    };
  }, []);
}

export function useVerticalAutoScroll(active: boolean) {
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!active) return;

    let frameId = 0;
    function tick() {
      if (!activeRef.current) return;
      document.scrollingElement!.scrollTop += 4;
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [active]);
}

export function useHorizontalAutoScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  active: boolean,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    let cancelled = false;
    function tick() {
      if (cancelled || !containerRef.current) return;
      containerRef.current.scrollLeft -= 4;
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [active, containerRef]);
}

export function useAutoNextPage(
  enabled: boolean,
  onNextPage?: EmptyFunction,
) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(enabled);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [countdown, setCountdown] = useState(0);

  autoScrollRef.current = enabled;

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !onNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const ratio = entries[0].intersectionRatio;
        if (!autoScrollRef.current) return;

        if (ratio > 0.95 && !timerRef.current) {
          setCountdown(3);
          timerRef.current = setInterval(() => {
            setCountdown((time) => {
              if (time === 1) {
                onNextPage();
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = undefined;
                }
              }
              return time - 1;
            });
          }, 1000);
          return;
        }

        if (ratio <= 0.95 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = undefined;
        }
      },
      { root: null, threshold: 0.99 },
    );

    observer.observe(trigger);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      observer.disconnect();
    };
  }, [onNextPage]);

  return { triggerRef, countdown };
}
