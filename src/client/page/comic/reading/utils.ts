import classNames from "classnames";

export function getComicImageClassName(
  filter: number | undefined,
  extra?: string,
) {
  return classNames("comic-img border-box", extra, {
    "filter invert": filter === 4,
    "filter backdrop-sepia-1": filter === 3,
    "filter brightness-50": filter === 1,
    "image-pixelated": filter === 2,
  });
}

export function resetVerticalScroll() {
  window.scrollTo(0, 0);
}

export function resetHorizontalScroll(container: HTMLElement | null) {
  if (!container) return;
  container.scrollLeft = container.scrollWidth - container.clientWidth;
}
