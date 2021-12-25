import tar from 'tar';

export default function compressToPath({
  compressFile,
  outputPath,
  onEntry,
  onDone,
}) {
  tar
    .x({
      file: compressFile,
      cwd: outputPath,
      keep: true,
      onentry: (en) => {
        if (onEntry) {
          onEntry(en);
        }
      },
    })
    .then(() => {
      onDone();
      return null;
    })
    .catch(() => {
      return null;
    });
}
