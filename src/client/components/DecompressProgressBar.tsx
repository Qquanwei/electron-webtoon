import { useDecompressProgress } from "./useDecompressProgress";
import styles from "./DecompressProgressBar.module.css";

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

  const percent = Math.min(100, Math.max(0, progress.percent));

  return (
    <div className={styles.bar}>
      <div className={styles.label}>
        正在解压 {archiveLabel} {progress.archiveName}
        {entryLabel}
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.percent}>{Math.round(percent)}%</div>
    </div>
  );
}
