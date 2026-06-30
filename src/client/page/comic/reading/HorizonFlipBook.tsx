import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from "react";
import { PageFlip } from "page-flip";

type FlipBookProps = Record<string, unknown> & {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  startPage?: number;
  renderOnlyPageLengthChange?: boolean;
  onFlip?: (event: { data: number }) => void;
  onChangeOrientation?: (event: unknown) => void;
  onChangeState?: (event: { data: string }) => void;
  onInit?: (event: { data: { page: number } }) => void;
  onUpdate?: (event: { data: { page: number } }) => void;
};

const HorizonFlipBook = React.forwardRef(function HorizonFlipBook(
  props: FlipBookProps,
  ref: Ref<{ pageFlip: () => PageFlip | undefined }>,
) {
  const htmlElementRef = useRef<HTMLDivElement>(null);
  const childRef = useRef<HTMLElement[]>([]);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const [pages, setPages] = useState<ReactElement[]>([]);
  const propsRef = useRef(props);
  propsRef.current = props;

  useImperativeHandle(ref, () => ({
    pageFlip: () => pageFlipRef.current ?? undefined,
  }));

  const refreshOnPageDelete = useCallback(() => {
    pageFlipRef.current?.clear();
  }, []);

  const removeHandlers = useCallback(() => {
    const flip = pageFlipRef.current;
    if (!flip) return;
    flip.off("flip");
    flip.off("changeOrientation");
    flip.off("changeState");
    flip.off("init");
    flip.off("update");
  }, []);

  useEffect(() => {
    childRef.current = [];
    if (!props.children) return;

    const childList = React.Children.map(props.children, (child) => {
      if (!React.isValidElement(child)) return child;
      return React.cloneElement(child, {
        ref: (dom: HTMLElement | null) => {
          if (dom) childRef.current.push(dom);
        },
      });
    }) as ReactElement[];

    if (
      !props.renderOnlyPageLengthChange ||
      pages.length !== childList.length
    ) {
      if (childList.length < pages.length) {
        refreshOnPageDelete();
      }
      setPages(childList);
    }
  }, [props.children, props.renderOnlyPageLengthChange, pages.length, refreshOnPageDelete]);

  useEffect(() => {
    const setHandlers = () => {
      const flip = pageFlipRef.current;
      const currentProps = propsRef.current;
      if (!flip) return;

      if (currentProps.onFlip) {
        flip.on("flip", currentProps.onFlip);
      }
      if (currentProps.onChangeOrientation) {
        flip.on("changeOrientation", currentProps.onChangeOrientation);
      }
      if (currentProps.onChangeState) {
        flip.on("changeState", currentProps.onChangeState);
      }
      if (currentProps.onInit) {
        flip.on("init", currentProps.onInit);
      }
      if (currentProps.onUpdate) {
        flip.on("update", currentProps.onUpdate);
      }
    };

    if (pages.length > 0 && childRef.current.length > 0) {
      removeHandlers();

      if (htmlElementRef.current && !pageFlipRef.current) {
        const {
          children: _children,
          className: _className,
          style: _style,
          onFlip: _onFlip,
          onChangeOrientation: _onChangeOrientation,
          onChangeState: _onChangeState,
          onInit: _onInit,
          onUpdate: _onUpdate,
          renderOnlyPageLengthChange: _renderOnlyPageLengthChange,
          ...settings
        } = propsRef.current;

        pageFlipRef.current = new PageFlip(
          htmlElementRef.current,
          settings as ConstructorParameters<typeof PageFlip>[1],
        );
      }

      if (!pageFlipRef.current.getFlipController()) {
        pageFlipRef.current.loadFromHTML(childRef.current);
      } else {
        pageFlipRef.current.updateFromHtml(childRef.current);
      }

      setHandlers();
    }
  }, [pages, removeHandlers]);

  return (
    <div ref={htmlElementRef} className={props.className} style={props.style}>
      {pages}
    </div>
  );
});

export default React.memo(HorizonFlipBook);
