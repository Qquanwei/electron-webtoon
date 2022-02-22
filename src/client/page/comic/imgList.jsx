/* eslint-disable */
import React, {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  Fragment,
} from 'react';
import Button from '@material-ui/core/Button';
import styles from './index.css';
import useComicContext from './useComicContext';

function ImgList({ onNextPage, hasNextPage, imgList }) {
  const { filter, autoScroll, setAutoScroll } = useComicContext();
  function renderList(list) {
    return list.map((item, index) => {
      if (item.name) {
        return (
          <Fragment key={index}>
            <div id={item.name} />
            {renderList(item.list)}
          </Fragment>
        );
      }

      return (
        <img
          loading="lazy"
          key={index}
          src={item}
          className={styles[`filter-${filter}`]}
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

  const onMouseUp = useCallback(() => {
    setAutoScroll(false);
  }, []);

  const onMouseDown = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
    setAutoScroll(true);
  }, []);

  useEffect(() => {
    document.scrollingElement.scrollTop = 0;
  }, [imgList]);

  const onClickNextPage = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onNextPage();
  }, []);

  return (
    <div
      className={styles.imglist}
      onTouchStart={onMouseDown}
      onTouchEnd={onMouseUp}
      onMouseUp={onMouseUp}
      onMouseDown={onMouseDown}
    >
      {renderList(imgList)}
      {hasNextPage ? (
        <Button
          onClick={onClickNextPage}
          className={styles.nextpagebtn}
          ref={nextPageBtnRef}
        >
          下一页{time === 0 ? '' : time}
        </Button>
      ) : null}
    </div>
  );
}

export default ImgList;
