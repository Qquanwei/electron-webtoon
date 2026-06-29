import { useEffect, useState, useCallback } from "react";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import ElectronWebtoonAppBar from "@components/appbar";
import { getIPC } from "@client/ipc";
import { useMessage } from "@components/useMessage";
import ShortcutSettings from "@components/ShortcutSettings";
import {
  PathSettingField,
  SettingsSection,
} from "@components/settings/SettingsSection";

export default function Settings() {
  const [decompressPath, setDecompressPath] = useState("");
  const [archivePath, setArchivePath] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingArchive, setSavingArchive] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resettingArchive, setResettingArchive] = useState(false);
  const { pushMessage } = useMessage();

  useEffect(() => {
    let mounted = true;
    async function load() {
      const ipc = await getIPC();
      const [decompressValue, archiveValue] = await Promise.all([
        ipc.get("decompressPath"),
        ipc.get("archivePath"),
      ]);
      if (!mounted) return;
      if (decompressValue) setDecompressPath(decompressValue as string);
      if (archiveValue) setArchivePath(archiveValue as string);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const onChoose = useCallback(async () => {
    const ipc = await getIPC();
    const result = await ipc.takeDirectory();
    if (!result.canceled && result.filePaths?.[0]) {
      setDecompressPath(result.filePaths[0]);
    }
  }, []);

  const onChooseArchive = useCallback(async () => {
    const ipc = await getIPC();
    const result = await ipc.takeDirectory();
    if (!result.canceled && result.filePaths?.[0]) {
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
      if (value) setDecompressPath(value as string);
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
      setArchivePath((value as string) || "");
    } finally {
      setResettingArchive(false);
    }
  }, []);

  return (
    <div className="min-h-full bg-neutral-50 pt-[70px]">
      <ElectronWebtoonAppBar hasSearch={false} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-black">
            设置
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            管理阅读快捷键、解压目录与归档路径
          </p>
        </header>

        <div className="space-y-6">
          <ShortcutSettings />

          <SettingsSection
            icon={<FolderOpenOutlinedIcon fontSize="small" />}
            title="解压缩路径"
            description="导入压缩包时，文件将解压到此目录"
          >
            <PathSettingField
              label="解压目录"
              hint="建议选择一个空间充足的文件夹。修改后，新添加的压缩包将解压到该位置。"
              value={decompressPath}
              placeholder="请选择或输入解压缩目录"
              onChange={setDecompressPath}
              onChoose={onChoose}
              onReset={onReset}
              onSave={onSave}
              saving={saving}
              resetting={resetting}
            />
          </SettingsSection>

          <SettingsSection
            icon={<ArchiveOutlinedIcon fontSize="small" />}
            title="归档路径"
            description="归档漫画时，源文件将被移动到此目录"
          >
            <PathSettingField
              label="归档目录"
              hint="在书库中归档漫画时，源文件会移到此位置，并从当前书库中移除。"
              value={archivePath}
              placeholder="请选择或输入归档目录"
              onChange={setArchivePath}
              onChoose={onChooseArchive}
              onReset={onResetArchive}
              onSave={onSaveArchive}
              saving={savingArchive}
              resetting={resettingArchive}
            />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
