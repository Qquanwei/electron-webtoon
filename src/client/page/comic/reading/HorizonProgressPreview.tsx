import { useEffect, useRef } from "react";
import classNames from "classnames";
import type { HorizonSpread } from "./horizonSpreads";
import { isCoverSpread } from "./horizonSpreads";
import styles from "./HorizonReader.module.css";

export const PREVIEW_SEGMENT_MIN_WIDTH = 50;

function scrollHighlightedSegmentToCenter(
  scroller: HTMLDivElement,
  activeButton: HTMLElement,
) {
  const segmentStart = activeButton.offsetLeft;
  const segmentWidth = activeButton.offsetWidth;
  const segmentEnd = segmentStart + segmentWidth;
  const segmentCenter = segmentStart + segmentWidth / 2;

  const viewWidth = scroller.clientWidth;
  const viewStart = scroller.scrollLeft;
  const viewEnd = viewStart + viewWidth;
  const edgeMargin = segmentWidth * 0.5;

  const shouldScroll =
    segmentStart < viewStart + edgeMargin ||
    segmentEnd > viewEnd - edgeMargin;

  if (!shouldScroll) {
    return;
  }

  const maxScroll = Math.max(0, scroller.scrollWidth - viewWidth);
  const targetScroll = segmentCenter - viewWidth / 2;
  scroller.scrollLeft = Math.min(maxScroll, Math.max(0, targetScroll));
}

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
    if (!scroller) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      const activeButton = scroller.querySelector<HTMLElement>(
        '[aria-current="true"]',
      );
      if (!activeButton) return;

      scrollHighlightedSegmentToCenter(scroller, activeButton);
    });

    return () => window.cancelAnimationFrame(frameId);
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
                        className={classNames(
                          styles.progressPageThumb,
                          styles.progressPageThumbLeft,
                        )}
                      />
                    ) : (
                      <span className={styles.progressPageBlank} />
                    )}
                    <img
                      src={spread.right}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={classNames(
                        styles.progressPageThumb,
                        styles.progressPageThumbRight,
                      )}
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
