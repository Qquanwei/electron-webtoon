import { Suspense, useState, useCallback, useEffect } from "react";
import { webUtils } from "electron";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import Index from "./page/index";
import Comic from "./page/comic";
import Settings from "./page/settings";
import * as selector from "./selector";
import { ComicOpenOverlay, RouteSuspenseFallback } from "./ComicOpenOverlay";
import "./App.global.css";
import { ipc } from "./ipc";
import { useMessage } from "@components/useMessage";
import DecompressProgressBar from "@components/DecompressProgressBar";
import { useDecompressProgress } from "@components/useDecompressProgress";
import { Snackbar, Alert } from "@mui/material";
import { useRecoilRefresher_UNSTABLE } from "recoil";

export default function App() {
  const [dragActive, setDragActive] = useState(false);
  const { pushMessage, messages } = useMessage();
  const { progress, setProgress } = useDecompressProgress();
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
      if (paths.length) {
        await ipc.handleDroppedFiles(paths);
      }
    } catch (err) {
      // ignore
      console.error("drop error:", err);
    }
  }, []);

  useEffect(() => {
    const unsubscribers = [
      ipc.onEvent("msg", (msg) => pushMessage(msg, 3000)),
      ipc.onEvent("decompress-progress", setProgress),
      ipc.onEvent("decompress-done", () => refreshComicList()),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [pushMessage, refreshComicList, setProgress]);

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
        <ComicOpenOverlay />
        <Suspense fallback={<RouteSuspenseFallback />}>
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

      <DecompressProgressBar />

      <Snackbar
        open={messages.length > 0}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        sx={{ bottom: progress.active ? 88 : 24 }}
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
