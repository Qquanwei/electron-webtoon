import { Suspense, useState, useCallback, useEffect } from "react";
import { webUtils } from "electron";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import Index from "./page/index";
import Comic from "./page/comic";
import Settings from "./page/settings";
import * as selector from "./selector";
import StartUpPage from "./startPage";
import "./App.global.css";
import { getIPC } from "./ipc";
import { useMessage } from "@components/useMessage";
import { Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { useRecoilRefresher_UNSTABLE } from "recoil";

export default function App() {
  const [dragActive, setDragActive] = useState(false);
  const { pushMessage, messages } = useMessage();
  const refreshComicList = useRecoilRefresher_UNSTABLE(selector.comicList);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    try {
      const files = Array.from(e.dataTransfer.files || []) as any[];

      const paths = files
        .map((f) => webUtils.getPathForFile(f))
        .filter(Boolean);
      paths.forEach((filePath) => {
        pushMessage(
          `已检测到文件拖入[${filePath}]，正在导入漫画，请稍候……`,
          1000,
        );
      });
      if (paths.length) {
        const ipc = await getIPC();
        await ipc.handleDroppedFiles(paths);
      }
    } catch (err) {
      // ignore
      console.error("drop error:", err);
    }
  }, []);

  useEffect(() => {
    async function work() {
      const ipc = await getIPC();
      ipc.onMsg((msg) => {
        pushMessage(msg, 3000);
      });
      ipc.onCompressFile((msg) => {
        pushMessage(msg, 3000);
      });
      ipc.onCompressDone(() => {
        pushMessage("处理完毕", 3000);
        refreshComicList();
      });
    }
    work();
  }, []);

  // TODO: loading 时能自动从所有logo中选一张岂不是完美了。
  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ height: "100%" }}
    >
      <Router>
        <Suspense fallback={<StartUpPage />}>
          <Switch>
            <Route exact path="/" component={Index} />
            <Route exact path="/settings" component={Settings} />
            <Route exact path="/settings/:id" component={Settings} />
            <Route path="/comic/:id" component={Comic} />
          </Switch>
        </Suspense>
      </Router>

      {dragActive && (
        <div
          className="pointer-events-none z-[999]"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 20,
          }}
        >
          将漫画文件夹或压缩包拖到这里以导入（松开即可导入）
        </div>
      )}

      <Snackbar
        open={messages.length > 0}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div>
          {messages
            .filter((msg) => msg.id)
            .map((item) => {
              return (
                <Alert severity="info" key={item.id} className="mt-2">
                  {item.msg}
                </Alert>
              );
            })}
        </div>
      </Snackbar>
    </div>
  );
}
