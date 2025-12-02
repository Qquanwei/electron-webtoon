import { useCallback } from "react";
import { atom, useRecoilState } from "recoil";
export interface IMsg {
  msg: string;
}

const messageAtom = atom<IMsg[]>({
  key: "messageAtom",
  default: [],
});

export function useMessage() {
  const [messages, setMessages] = useRecoilState(messageAtom);
  const pushMessage = useCallback((msg, ms) => {
    const msgItem = {
      msg,
    };
    setTimeout(() => {
      setMessages((msgs) => {
        return msgs.filter((item) => item !== msgItem);
      });
    }, ms);
    setMessages((msgs) => {
      return msgs.concat(msgItem);
    });
  }, []);
  return { messages, pushMessage };
}
