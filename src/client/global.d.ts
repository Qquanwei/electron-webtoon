declare module "tiny-event-manager" {
  export function createEventListener(
    ele: HTMLElement,
    event: "click",
    cb: () => void,
  ): {
    unsubscribe: () => void;
  };
}

declare module "*.css";
