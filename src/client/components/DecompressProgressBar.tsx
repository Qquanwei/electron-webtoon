import { LinearProgress } from "@mui/material";
import { useDecompressProgress } from "./useDecompressProgress";

export default function DecompressProgressBar() {
  const { progress } = useDecompressProgress();

  if (!progress.active) {
    return null;
  }

  const archiveLabel =
    progress.archiveTotal > 1
      ? `(${progress.archiveIndex + 1}/${progress.archiveTotal})`
      : "";

  const entryLabel =
    progress.entryTotal > 0
      ? ` · ${progress.entryProcessed}/${progress.entryTotal} 个文件`
      : "";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] bg-white/95 shadow-[0_-2px_12px_rgba(0,0,0,0.12)] px-4 py-3">
      <div className="mb-2 text-sm text-gray-700 truncate">
        正在解压 {archiveLabel} {progress.archiveName}
        {entryLabel}
      </div>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, progress.percent))}
        className="h-2 rounded"
      />
      <div className="mt-1 text-xs text-gray-500 text-right">
        {Math.round(progress.percent)}%
      </div>
    </div>
  );
}
