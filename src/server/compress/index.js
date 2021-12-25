import path from 'path';
import fs from 'fs';
import tar from './tar';

export default async function decompress(file, outputPath, onEntry, onDone) {
  return new Promise((resolve) => {
    if (file.endsWith('.tar')) {
      const outputDirname = path.resolve(
        outputPath,
        path.basename(file).slice(0, -4)
      );
      fs.mkdirSync(path.resolve(outputPath, outputDirname));
      tar({
        compressFile: file,
        outputPath: path.resolve(outputPath, outputDirname),
        onEntry: (en) => {
          if (onEntry) {
            onEntry({
              filename: file,
              imgname: en.header.path,
            });
          }
        },
        onDone: (done) => {
          if (onDone) {
            onDone({
              pathname: path.resolve(
                outputPath,
                path.basename(file).slice(0, -4)
              ),
              filename: file,
            });
          }
        },
      });
    } else if (file.endsWith('.tar.gz')) {
      const outputDirname = path.resolve(
        outputPath,
        path.basename(file).slice(0, -7)
      );
      fs.mkdirSync(path.resolve(outputPath, outputDirname));
      tar({
        compressFile: file,
        outputPath: path.resolve(outputPath, outputDirname),
        onEntry: (en) => {
          if (onEntry) {
            onEntry({
              filename: file,
              imgname: en.header.path,
            });
          }
        },
        onDone: (done) => {
          if (onDone) {
            onDone({
              pathname: path.resolve(
                outputPath,
                path.basename(file).slice(0, -7)
              ),
              filename: file,
            });
          }
        },
      });
    }
  });
}
