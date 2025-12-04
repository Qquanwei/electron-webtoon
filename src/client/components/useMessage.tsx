import { useCallback } from "react";
import { atom, useRecoilState } from "recoil";
export interface IMsg {
  msg: string;
  id: string;
}

const messageAtom = atom<IMsg[]>({
  key: "messageAtom",
  default: [],
});

export function useMessage() {
  const [messages, setMessages] = useRecoilState(messageAtom);
  const pushMessage = useCallback((msg, ms) => {
    const id = Math.random().toString(16).slice(2);
    const msgItem = {
      msg,
      id,
    };
    setTimeout(() => {
      setMessages((msgs) => {
        return msgs.filter((item) => item.id !== id);
      });
    }, ms);
    setMessages((msgs) => {
      return msgs.concat(msgItem);
    });
  }, []);
  return { messages, pushMessage };
}
