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
}
// onVisitPosition: 当对应图片露出时调用，用来记录看到的位置
const VerticalImgList: React.FC<ImgListProps> = ({
  onNextPage,
  hasNextPage,
  imgList,
  onVisitPosition,
  horizon = false,
}) => {
  const { filter, autoScroll, comic } = useComicContext();
  /* 只有首次初始化ImgList时才自动定位到comic.position位置*/
  const firstElePosition = useMemo(() => {
    if (comic) {
      if (Number.isInteger(comic.position) && comic.position) {
        return comic.position;
      }
    }
    return -1;
  }, [comic]);

  const [isFirst, setIsFirst] = useState(firstElePosition !== -1);

  const onVisitPositionRef = useRef<typeof onVisitPosition | null>(null);
  onVisitPositionRef.current = onVisitPosition;

  useEffect(() => {
    // 当首次进入之后，才开始进行visiblechange展示
    if (!isFirst) {
      const observer = new IntersectionObserver((entities) => {
        if (entities[0].intersectionRatio && onVisitPositionRef.current) {
          const position = Number(
            (entities[0].target as HTMLImageElement)?.dataset?.index,
          );
          if (position !== 0) {
            onVisitPositionRef.current(position);
          }
        }
      });

      document.querySelectorAll(".comic-img").forEach((ele) => {
        observer.observe(ele);
      });

      return () => {
        observer.disconnect();
      };
    }

    return () => {};
  }, [isFirst]);

  const onImgLoad = useCallback(
    (e) => {
      if (
        isFirst &&
        Number(e.currentTarget.dataset.index) === firstElePosition
      ) {
        const target = e.currentTarget;
        document.scrollingElement?.classList.add("scroll-smooth");
        setTimeout(() => {
          target.scrollIntoView();
        }, 50);
        setTimeout(() => {
          setIsFirst(false);
          document.scrollingElement?.classList.remove("scroll-smooth");
        }, 100);
      }
    },
    [isFirst],
  );

  function renderList(list: string[]) {
    return list.map((item, index) => {
      return (
        <img
          key={index}
          src={item}
          onLoad={onImgLoad}
          data-index={index}
          className={classNames(
            "comic-img border-box border border-black mx-auto",
            {
              "filter invert": filter === 4,
              "filter backdrop-sepia-1": filter === 3,
              "filter brightness-50": filter === 1,
              "image-pixelated": filter === 2,
            },
          )}
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
        className={classNames("z-10", { "!hidden": !isFirst })}
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

const HorizonImgList: React.FC<ImgListProps> = ({ imgList }) => {
  useEffect(() => {
    document.body.classList.add("overflow-y-hidden");
    if (document.scrollingElement) {
      const subscription = createEventListener(
        document.scrollingElement,
        "wheel",
        (event: WheelEvent) => {
          if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
            // 像素滚动
            window.scrollBy({
              top: 0,
              left: event.deltaY,
            });
          }
        },
      );
      return () => {
        subscription.unsubscribe();
        document.body.classList.remove("overflow-y-hidden");
      };
    }
  }, []);
  return (
    <div className="flex flex-row">
      {imgList.map((src) => {
        return (
          <img
            src={src}
            className="max-w-full h-[100vh] flex-shrink-0 ml-4 border my-auto"
          ></img>
        );
      })}
    </div>
  );
};

const ImgList = (props: ImgListProps) => {
  const { comic } = useComicContext();
  if (comic?.pageMode === "horizon") {
    return <HorizonImgList {...props}></HorizonImgList>;
  }
  return <VerticalImgList {...props}></VerticalImgList>;
};
export default ImgList;
