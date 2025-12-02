import { useEffect, useState, useCallback } from "react";
import ElectronWebtoonAppBar from "@components/appbar";
import { getIPC } from "@client/ipc";
import { useMessage } from "@components/useMessage";

// 设置页面
export default function Settings() {
  const [path, setPath] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const { pushMessage } = useMessage();

  useEffect(() => {
    let mounted = true;
    async function load() {
      const ipc = await getIPC();
      const value = await ipc.get("decompressPath");
      if (mounted && value) {
        setPath(value as string);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const onChoose = useCallback(async () => {
    const ipc = await getIPC();
    const result = await ipc.takeDirectory();
    if (!result.canceled && result.filePaths && result.filePaths[0]) {
      setPath(result.filePaths[0]);
    }
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const ipc = await getIPC();
      await ipc.set("decompressPath", path);
      pushMessage("保存成功", 1000);
    } catch {
      pushMessage("保存失败", 1000);
    } finally {
      setSaving(false);
    }
  }, [path, pushMessage]);

  const onReset = useCallback(async () => {
    setResetting(true);
    try {
      const ipc = await getIPC();
      await ipc.reset("decompressPath");
      const value = await ipc.get("decompressPath");
      if (value) {
        setPath(value as string);
      }
    } finally {
      setResetting(false);
    }
  }, []);

  return (
    <div className="pt-[70px]">
      <ElectronWebtoonAppBar hasSearch={false}></ElectronWebtoonAppBar>
      <div className="p-4">
        <h2 className="text-xl mb-4">设置</h2>

        <div className="mb-4">
          <label className="block mb-2">解压缩路径</label>
          <div className="flex items-center">
            <input
              className="flex-1 border rounded p-2 mr-2"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="请选择或输入解压缩目录"
            />
            <button
              className="bg-gray-200 px-3 py-2 rounded mr-2"
              onClick={onChoose}
            >
              选择...
            </button>
            <button
              className="bg-gray-200 px-3 py-2 rounded mr-2"
              onClick={onReset}
              disabled={resetting}
            >
              {resetting ? "重置中..." : "重置"}
            </button>
            <button
              className="bg-sky-500 text-white px-3 py-2 rounded"
              onClick={onSave}
              disabled={saving}
            >
              保存
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          该路径用于解压缩临时文件，建议选择一个有足够空间的文件夹。设置后，新添加的压缩包将解压缩到该位置。
        </div>
      </div>
    </div>
  );
}
