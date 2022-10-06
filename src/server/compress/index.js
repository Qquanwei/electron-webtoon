import path from "path";
import fs from "fs";
import _7z from "./_7zmin";

export default async function decompress(file, outputPath, onEntry, onDone) {
  return new Promise((resolve, reject) => {
    const outputDirname = path.resolve(
      outputPath,
      path.basename(file).slice(0, -4)
    );
    if (!fs.existsSync(path.resolve(outputPath, outputDirname))) {
      fs.mkdirSync(path.resolve(outputPath, outputDirname));
    }

    _7z.unpack(file, path.resolve(outputPath, outputDirname), (err) => {
      if (err) {
        onEntry(`${file}解压失败:${err.message}`);
        reject(err);
      } else {
        onDone({ pathname: path.resolve(outputPath, outputDirname) });
        resolve();
      }
    });
  });
}
