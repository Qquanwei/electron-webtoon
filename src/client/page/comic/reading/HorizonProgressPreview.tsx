import { useEffect, useRef } from "react";
import classNames from "classnames";
import type { HorizonSpread } from "./horizonSpreads";
import { isCoverSpread } from "./horizonSpreads";
import styles from "./HorizonReader.module.css";

export const PREVIEW_SEGMENT_MIN_WIDTH = 50;

interface HorizonProgressPreviewProps {
  spreads: HorizonSpread[];
  spreadIndex: number;
  animating?: boolean;
  onSelect: (index: number) => void;
}

export default function HorizonProgressPreview({
  spreads,
  spreadIndex,
  animating,
  onSelect,
}: HorizonProgressPreviewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackWidth = spreads.length * PREVIEW_SEGMENT_MIN_WIDTH;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const activeButton = scroller.querySelector<HTMLElement>(
      '[aria-current="true"]',
    );
    if (!activeButton) return;

    const segmentStart = activeButton.offsetLeft;
    const segmentEnd = segmentStart + activeButton.offsetWidth;
    const viewStart = scroller.scrollLeft;
    const viewEnd = viewStart + scroller.clientWidth;

    if (segmentStart < viewStart) {
      scroller.scrollLeft = segmentStart;
      return;
    }
    if (segmentEnd > viewEnd) {
      scroller.scrollLeft = segmentEnd - scroller.clientWidth;
    }
  }, [spreadIndex]);

  if (spreads.length <= 1) {
    return null;
  }

  return (
    <div className={styles.progressPreview} data-horizon-preview>
      <div
        ref={scrollerRef}
        className={styles.progressScroller}
        onWheel={(event) => event.stopPropagation()}
      >
        <div
          className={styles.progressTrack}
          style={{ width: `${trackWidth}px` }}
        >
          {spreads.map((spread, index) => (
            <button
              key={`${spread.rightIndex}-${spread.leftIndex ?? "single"}`}
              type="button"
              className={classNames(styles.progressSegment, {
                [styles.progressSegmentActive]: index === spreadIndex,
              })}
              disabled={animating}
              onClick={() => onSelect(index)}
              aria-label={`第 ${index + 1} 双页`}
              aria-current={index === spreadIndex ? "true" : undefined}
            >
              <span className={styles.progressSegmentInner}>
                {isCoverSpread(spread) ? (
                  <img
                    src={spread.right}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={styles.progressCoverThumb}
                  />
                ) : (
                  <>
                    {spread.left ? (
                      <img
                        src={spread.left}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className={styles.progressPageThumb}
                      />
                    ) : (
                      <span className={styles.progressPageBlank} />
                    )}
                    <img
                      src={spread.right}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={styles.progressPageThumb}
                    />
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
