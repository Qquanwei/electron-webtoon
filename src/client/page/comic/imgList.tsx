import React, {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import classNames from "classnames";
import StartUpPage from "../../startPage";
import useComicContext from "./useComicContext";
import { EmptyFunction, UnaryFunction } from "@shared/type";
import { createEventListener } from "tiny-event-manager";

interface ImgListProps {
  onNextPage?: EmptyFunction;
  hasNextPage?: boolean;
  imgList: string[];
  onVisitPosition?: UnaryFunction<number>;
  horizon?: boolean;
  // 当前渲染的章节名
  tag?: string;
}

function useFirstElePosition(tag?: string) {
  const { comic } = useComicContext();
  /* 只有首次初始化ImgList时才自动定位到comic.position位置*/
  const firstElePosition = useMemo(() => {
    if (comic) {
      // 非本章节，返回0
      if (tag && comic.tag && comic.tag !== tag) {
        return 0;
      }
      if (Number.isInteger(comic.position) && comic.position) {
        return Number(comic.position);
      }
    }
    return 0;
  }, [comic, tag]);
  return firstElePosition;
}

/**
 * 1. 监听dom元素为 类名：comic-tag
 * 该元素必须有data-index 属性，表示当前位置
 * @param onVisiblePosition
 */
function useWatchComicPositionChange(
  enable?: boolean,
  onVisiblePosition?: UnaryFunction<number>,
) {
  const onVisitPositionRef = useRef(onVisiblePosition);
  onVisitPositionRef.current = onVisiblePosition;

  useEffect(() => {
    if (!onVisiblePosition) {
      return () => {};
    }

    if (!enable) {
      return () => {};
    }

    const observer = new IntersectionObserver(
      (entities) => {
        // 使用!entities[0].isIntersecting来只记录消失的DOM元素
        if (
          entities[0].intersectionRatio &&
          onVisitPositionRef.current &&
          !entities[0].isIntersecting
        ) {
          const img = entities[0].target as HTMLImageElement;
          const position = Number(img?.dataset?.index);
          if (position > 0) {
            onVisitPositionRef.current(position);
          }
        }
      },
      {
        threshold: [0.8],
      },
    );

    document.querySelectorAll(".comic-img").forEach((ele) => {
      observer.observe(ele);
    });

    return () => {
      observer.disconnect();
    };
  }, [enable]);
}

function useImgLoadAutoScrollIntoView(
  imgList: string[],
  firstElePosition: number,
  container?: Element,
  /**
   * 加载成功回调
   */
  firstElementOnLoad?: EmptyFunction,
) {
  const containerRef = useRef(container);
  const firstElementOnLoadRef = useRef(firstElementOnLoad);
  containerRef.current = container;
  const firstElePositionRef = useRef<number>(firstElePosition);
  firstElePositionRef.current = firstElePosition;

  useEffect(() => {
    if (firstElePosition < 0 || firstElePositionRef.current > imgList.length) {
      if (firstElementOnLoadRef.current) {
        firstElementOnLoadRef.current();
      }
    }
  }, []);

  const onLoad = useCallback((e) => {
    if (Number(e.currentTarget.dataset.index) === firstElePositionRef.current) {
      const target = e.currentTarget;
      if (containerRef.current) {
        containerRef.current.classList.add("scroll-smooth");
      }
      if (firstElementOnLoadRef.current) {
        firstElementOnLoadRef.current();
      }
      setTimeout(() => {
        target.scrollIntoView();
      }, 50);
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.classList.remove("scroll-smooth");
        }
      }, 100);
    }
  }, []);

  return { onLoad };
}
// onVisitPosition: 当对应图片露出时调用，用来记录看到的位置
const VerticalImgList: React.FC<ImgListProps> = ({
  onNextPage,
  hasNextPage,
  imgList,
  onVisitPosition,
  horizon = false,
  tag,
}) => {
  const { filter, autoScroll } = useComicContext();
  /* 只有首次初始化ImgList时才自动定位到comic.position位置*/
  const firstElePosition = useFirstElePosition(tag);

  const [loading, setLoading] = useState(true);
  const [scrollingDone, setScrollingDone] = useState(false);

  const onVisitPositionRef = useRef<typeof onVisitPosition | null>(null);
  onVisitPositionRef.current = onVisitPosition;
  useWatchComicPositionChange(!loading && scrollingDone, onVisitPosition);
  const { onLoad: onImgLoad } = useImgLoadAutoScrollIntoView(
    imgList,
    firstElePosition,
    document.scrollingElement!,
    () => {
      setLoading(false);
      setTimeout(() => {
        setScrollingDone(true);
      }, 500);
    },
  );

  function renderList(list: string[]) {
    return list.map((item, index) => {
      return (
        <img
          key={index}
          src={item}
          onLoad={onImgLoad}
          data-index={index}
          className={classNames("comic-img border-box mx-auto", {
            "filter invert": filter === 4,
            "filter backdrop-sepia-1": filter === 3,
            "filter brightness-50": filter === 1,
            "image-pixelated": filter === 2,
          })}
        />
      );
    });
  }

  const autoScrollRef = useRef(false);
  const nextPageBtnRef = useRef(null);
  const [time, setTime] = useState(0);
  const nextPageTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (autoScroll) {
      autoScrollRef.current = true;
      function scroll() {
        if (document.scrollingElement) {
          document.scrollingElement.scrollTop += 4;
        }

        if (autoScrollRef.current) {
          requestAnimationFrame(scroll);
        }
      }
      autoScrollRef.current = true;
      requestAnimationFrame(scroll);
    } else {
      autoScrollRef.current = false;
    }

    return () => {
      autoScrollRef.current = false;
    };
  }, [autoScroll]);

  // intersectionobserver自动下一页
  useLayoutEffect(() => {
    if (nextPageBtnRef.current) {
      const options = {
        root: null,
        threshold: 0.99,
      };

      const observer = new IntersectionObserver((entities) => {
        if (autoScrollRef.current) {
          if (entities[0].intersectionRatio > 0.95 && !nextPageTimer.current) {
            setTime(3);
            nextPageTimer.current = setInterval(() => {
              setTime((time) => {
                if (time === 1) {
                  if (onNextPage) {
                    onNextPage();
                  }
                  if (nextPageTimer.current) {
                    clearInterval(nextPageTimer.current);
                    nextPageTimer.current = undefined;
                  }
                }
                return time - 1;
              });
            }, 1000);
          }
          if (entities[0].intersectionRatio <= 0.95) {
            if (nextPageTimer.current) {
              clearInterval(nextPageTimer.current);
              nextPageTimer.current = undefined;
            }
          }
        }
      }, options);

      observer.observe(nextPageBtnRef.current);

      return () => {
        if (nextPageTimer.current) {
          clearInterval(nextPageTimer.current);
        }
        if (nextPageBtnRef.current) {
          observer.unobserve(nextPageBtnRef.current);
        }
      };
    }

    return () => null;
  }, [onNextPage, imgList]);

  useLayoutEffect(() => {
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0;
    }
    document.scrollingElement?.classList.add("overflow-x-hidden");
    return () => {
      document.scrollingElement?.classList.remove("overflow-x-hidden");
    };
  }, []);

  const onClickNextPage = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNextPage) {
      onNextPage();
    }
  }, []);

  return (
    <div
      className={classNames("w-full select-none text-0", {
        "flex flex-col justify-center": !horizon,
        flex: horizon,
      })}
    >
      <StartUpPage
        className={classNames("z-10", { "!hidden": !loading })}
      ></StartUpPage>
      {renderList(imgList)}
      {hasNextPage ? (
        <div
          onClick={onClickNextPage}
          className="cursor-pointer transition transition-all hover:font-bold hover:text-sky-500 py-[20px] w-[50px] text-sky-300 mx-auto text-center"
          ref={nextPageBtnRef}
        >
          下一页{time === 0 ? "" : time}
        </div>
      ) : null}
    </div>
  );
};

const HorizonImgList: React.FC<ImgListProps> = ({
  imgList,
  onVisitPosition,
  tag,
}) => {
  /* 只有首次初始化ImgList时才自动定位到comic.position位置*/
  const firstElePosition = useFirstElePosition(tag);
  const [loading, setLoading] = useState(true);
  const [scrollingDone, setScrollingDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useWatchComicPositionChange(!loading && scrollingDone, onVisitPosition);

  const { onLoad: onImgLoad } = useImgLoadAutoScrollIntoView(
    imgList,
    firstElePosition,
    containerRef.current!,
    () => {
      setLoading(false);
      setTimeout(() => {
        setScrollingDone(true);
      }, 500);
    },
  );

  useEffect(() => {
    document.body.classList.add("overflow-y-hidden");
    if (document.scrollingElement) {
      const subscription = createEventListener(
        document.scrollingElement,
        "wheel",
        (event: WheelEvent) => {
          if (
            event.deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
            containerRef.current
          ) {
            // 像素滚动
            containerRef.current.scrollBy({
              top: 0,
              left: -event.deltaY,
            });
          }
        },
      );
      return () => {
        subscription.unsubscribe();
        document.body.classList.remove("overflow-y-hidden");
      };
    }
    return () => {};
  }, []);

  const reverseImgList = useMemo(() => {
    return [...imgList].reverse();
  }, [imgList]);

  return (
    <div
      ref={containerRef}
      className="flex flex-row bg-white h-[100vh] border-box overflow-x-scroll overflow-y-hidden"
    >
      <StartUpPage
        className={classNames("z-10", { "!hidden": !loading })}
      ></StartUpPage>
      {reverseImgList.map((src, index) => {
        return (
          <div
            key={index}
            className="flex-shrink-0 px-2 bg-gray-500 h-[100vh] bg-gray-100 ml-4 border border-box flex items-center"
          >
            <img
              onLoad={onImgLoad}
              src={src}
              loading="eager"
              data-index={reverseImgList.length - 1 - index}
              className="comic-img bg-gray-100 max-w-full max-h-full my-auto"
            ></img>
          </div>
        );
      })}
    </div>
  );
};

const ImgList = (props: ImgListProps) => {
  const { comic } = useComicContext();

  useEffect(() => {
    // 当imgList发生变化时，重置滚动条
    window.scrollTo(0, 0);
  }, [props.imgList]);

  if (comic?.pageMode === "horizon") {
    return <HorizonImgList {...props}></HorizonImgList>;
  }
  return <VerticalImgList {...props}></VerticalImgList>;
};
export default ImgList;
