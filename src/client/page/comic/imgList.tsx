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

interface ImgListProps {
  onNextPage: () => void;
  hasNextPage: boolean;
  imgList: string[];
  onVisitPosition: () => void;
  horizon: boolean;
}
// onVisitPosition: 当对应图片露出时调用，用来记录看到的位置
const ImgList: React.FC<ImgListProps> = ({
  onNextPage,
  hasNextPage,
  imgList,
  onVisitPosition,
  horizon,
}) => {
  const { filter, autoScroll, comic } = useComicContext();
  /* 只有首次初始化ImgList时才自动定位到comic.position位置*/
  const firstElePosition = useMemo(() => {
    if (Number.isInteger(comic.position) && comic.position) {
      return comic.position;
    }
    return -1;
  }, []);

  const [isFirst, setIsFirst] = useState(firstElePosition !== -1);

  const onVisitPositionRef = useRef<typeof onVisitPosition | null>(null);
  onVisitPositionRef.current = onVisitPosition;

  useEffect(() => {
    // 当首次进入之后，才开始进行visiblechange展示
    if (!isFirst) {
      const observer = new IntersectionObserver((entities) => {
        if (entities[0].intersectionRatio && onVisitPositionRef.current) {
          const position = Number(entities[0].target.dataset.index);
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
        setTimeout(() => {
          target.scrollIntoView();
        }, 50);
        setTimeout(() => {
          setIsFirst(false);
        }, 100);
      }
    },
    [isFirst],
  );

  function renderList(list) {
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
              'filter brightness-50': filter === 1,
              'image-pixelated': filter === 2
            }
          )}
        />
      );
    });
  }

  const autoScrollRef = useRef(false);
  const nextPageBtnRef = useRef(null);
  const [time, setTime] = useState(0);
  const nextPageTimer = useRef(0);

  useEffect(() => {
    if (autoScroll) {
      autoScrollRef.current = true;
      function scroll() {
        document.scrollingElement.scrollTop += 4;
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
          if (
            entities[0].intersectionRatio > 0.95 &&
            nextPageTimer.current === 0
          ) {
            setTime(3);
            nextPageTimer.current = setInterval(() => {
              setTime((time) => {
                if (time === 1) {
                  onNextPage();
                  clearInterval(nextPageTimer.current);
                  nextPageTimer.current = 0;
                }
                return time - 1;
              });
            }, 1000);
          }
          if (entities[0].intersectionRatio <= 0.95) {
            clearInterval(nextPageTimer.current);
            nextPageTimer.current = 0;
          }
        }
      }, options);

      observer.observe(nextPageBtnRef.current);

      return () => {
        clearInterval(nextPageTimer.current);
        if (nextPageBtnRef.current) {
          observer.unobserve(nextPageBtnRef.current);
        }
      };
    }

    return () => null;
  }, [onNextPage, imgList]);

  useEffect(() => {
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0;
    }
  }, [imgList]);

  const onClickNextPage = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onNextPage();
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

export default ImgList;
