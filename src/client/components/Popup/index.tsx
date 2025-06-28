import {
  HTMLAttributes,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { createEventListener } from "tiny-event-manager";
import ReactDOM from "react-dom";
import { UnaryFunction } from "@shared/type";

interface PopupProps extends Pick<HTMLAttributes<HTMLDivElement>, "style"> {
  tooltip?: ReactNode;
  visible?: boolean;
  className?: string;
  visibleChange?: UnaryFunction<boolean>;
  position?: "bottom" | "center";
}
/**
 * Popup 悬浮提示组件
 * @param param0
 * @returns
 */
const Popup: React.FC<PopupProps> = ({
  className,
  children,
  tooltip,
  visible,
  visibleChange,
  style,
  position = "bottom",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<ReturnType<typeof createEventListener> | null>(
    null,
  );
  const div = useMemo(() => {
    const ret = document.createElement("div");
    ret.style.position = "fixed";
    ret.classList.add("invisible");
    ret.classList.add("rounded");
    ret.classList.add("z-10");
    document.body.appendChild(ret);
    return ret;
  }, []);

  useEffect(() => {
    if (visible && ref.current) {
      const anchor = ref.current;
      const rect = anchor.getBoundingClientRect();

      if (position === "bottom") {
        div.style.top = rect.top + 5 + rect.height + "px";
        div.style.left =
          rect.left + rect.width / 2 - Math.floor(div.clientWidth / 2) + "px";
      } else if (position === "center") {
        div.style.top = rect.top + Math.floor(rect.height) / 2 + "px";
        div.style.left =
          rect.left + rect.width / 2 - Math.floor(div.clientWidth / 2) + "px";
      }

      div.classList.remove("invisible");

      setTimeout(() => {
        subscriptionRef.current = createEventListener(
          document.documentElement,
          "click",
          () => {
            if (visibleChange) {
              visibleChange(false);
            }
          },
        );
      });
    } else {
      div.classList.add("invisible");
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      document.body.removeChild(div);
    };
  }, []);
  return (
    <div ref={ref} className={className || ""} style={style}>
      {children}
      {ReactDOM.createPortal(tooltip, div)}
    </div>
  );
};

export default Popup;
