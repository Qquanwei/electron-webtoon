declare module "tiny-event-manager" {
  export function createEventListener(
    ele: HTMLElement | Element,
    event: "click" | "scroll",
    cb: (event: MouseEvent) => void,
  ): {
    unsubscribe: () => void;
  };
  export function createEventListener(
    ele: HTMLElement | Element,
    event: "wheel",
    cb: (event: WheelEvent) => void,
  ): {
    unsubscribe: () => void;
  };
}

declare module "*.css";
