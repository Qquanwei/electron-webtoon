import { useEffect, useState, useCallback } from "react";
import ElectronWebtoonAppBar from "@components/appbar";
import { getIPC } from "@client/ipc";
import { useMessage } from "@components/useMessage";

// 设置页面
export default function Settings() {
  const [decompressPath, setDecompressPath] = useState<string>("");
  const [archivePath, setArchivePath] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [savingArchive, setSavingArchive] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [resettingArchive, setResettingArchive] = useState<boolean>(false);
  const { pushMessage } = useMessage();

  useEffect(() => {
    let mounted = true;
    async function load() {
      const ipc = await getIPC();
      const decompressValue = await ipc.get("decompressPath");
      const archiveValue = await ipc.get("archivePath");
      if (mounted) {
        if (decompressValue) {
          setDecompressPath(decompressValue as string);
        }
        if (archiveValue) {
          setArchivePath(archiveValue as string);
        }
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
      setDecompressPath(result.filePaths[0]);
    }
  }, []);

  const onChooseArchive = useCallback(async () => {
    const ipc = await getIPC();
    const result = await ipc.takeDirectory();
    if (!result.canceled && result.filePaths && result.filePaths[0]) {
      setArchivePath(result.filePaths[0]);
    }
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const ipc = await getIPC();
      await ipc.set("decompressPath", decompressPath);
      pushMessage("保存成功", 1000);
    } catch {
      pushMessage("保存失败", 1000);
    } finally {
      setSaving(false);
    }
  }, [decompressPath, pushMessage]);

  const onSaveArchive = useCallback(async () => {
    setSavingArchive(true);
    try {
      const ipc = await getIPC();
      await ipc.set("archivePath", archivePath);
      pushMessage("保存成功", 1000);
    } catch {
      pushMessage("保存失败", 1000);
    } finally {
      setSavingArchive(false);
    }
  }, [archivePath, pushMessage]);

  const onReset = useCallback(async () => {
    setResetting(true);
    try {
      const ipc = await getIPC();
      await ipc.reset("decompressPath");
      const value = await ipc.get("decompressPath");
      if (value) {
        setDecompressPath(value as string);
      }
    } finally {
      setResetting(false);
    }
  }, []);

  const onResetArchive = useCallback(async () => {
    setResettingArchive(true);
    try {
      const ipc = await getIPC();
      await ipc.reset("archivePath");
      const value = await ipc.get("archivePath");
      setArchivePath(value as string);
    } finally {
      setResettingArchive(false);
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
              value={decompressPath}
              onChange={(e) => setDecompressPath(e.target.value)}
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
          <div className="text-sm text-gray-500 mt-2">
            该路径用于解压缩临时文件，建议选择一个有足够空间的文件夹。设置后，新添加的压缩包将解压缩到该位置。
          </div>
        </div>

        <div className="mb-4">
          <label className="block mb-2">归档路径</label>
          <div className="flex items-center">
            <input
              className="flex-1 border rounded p-2 mr-2"
              value={archivePath}
              onChange={(e) => setArchivePath(e.target.value)}
              placeholder="请选择或输入归档目录"
            />
            <button
              className="bg-gray-200 px-3 py-2 rounded mr-2"
              onClick={onChooseArchive}
            >
              选择...
            </button>
            <button
              className="bg-gray-200 px-3 py-2 rounded mr-2"
              onClick={onResetArchive}
              disabled={resettingArchive}
            >
              {resettingArchive ? "重置中..." : "重置"}
            </button>
            <button
              className="bg-sky-500 text-white px-3 py-2 rounded"
              onClick={onSaveArchive}
              disabled={savingArchive}
            >
              保存
            </button>
          </div>
          <div className="text-sm text-gray-500 mt-2">
            当右键归档漫画时，该漫画源文件会移到此位置，并从当前漫画库删除。
          </div>
        </div>
      </div>
    </div>
  );
}
