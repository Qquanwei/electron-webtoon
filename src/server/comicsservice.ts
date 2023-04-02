/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
import electron, { app } from "electron";
import imageSize from "image-size";
import URL from "url";
import { v4 as uuidv4 } from "uuid";
import * as R from "ramda";
import path from "path";
import fs from "fs";
import fsPromisese from "fs.promises";
import Store from "electron-store";
import decompress from "./compress";
import sortImgListByName from "./sortImgListByName";

function isDirectory(fullpath: string) {
  return fs.lstatSync(fullpath).isDirectory();
}

const supportExts = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".apng",
  ".avif",
  ".tiff",
];

const supportCompressExts = [
  "tar",
  "tar.gz",
  "7z",
  "zip",
  "lzma",
  "cab",
  "tar.bz2",
];

function extNameLegal(file: string) {
  const ext = path.extname(file);
  return supportExts.includes(ext);
}

function flatten(tree: IComicImgList): string[] {
  let list: string[] = [];
  // eslint-disable-next-line
  for (const t of tree) {
    if (typeof t === "string") {
      list.push(t);
    } else {
      list = list.concat(flatten(t.list));
    }
  }
  return list;
}

// deep 子文件夹个数
async function buildComicImgList(
  pathname: string,
  deep = 1000,
  makeUrl: IMakeUrl
): Promise<IComicImgList> {
  const files = await fsPromisese.readdir(pathname);

  const legalFiles = files.filter((file: string) => {
    return isDirectory(path.resolve(pathname, file)) || extNameLegal(file);
  });

  const result: IComicImgList = [];
  // 如果该目录是既有图片又有目录，则，将这些图片放在一个单独的目录中
  let singlePics: IComicImgList = [];
  for (let i = 0; i < legalFiles.length && deep; i += 1) {
    const fileOrDirName: string = legalFiles[i];
    if (isDirectory(path.resolve(pathname, fileOrDirName))) {
      // eslint-disable-next-line
      const list = await buildComicImgList(
        path.resolve(pathname, fileOrDirName),
        deep - 1,
        makeUrl
      );
      result.push({
        name: fileOrDirName,
        list,
      });
    } else {
      singlePics.push(makeUrl(path.resolve(pathname, fileOrDirName)));
    }
  }
  if (result.length === 0) {
    return singlePics;
  }

  if (singlePics.length) {
    return [{
      name: '无目录-1',
      list: singlePics
    }].concat(result as any);
  }

  return result;
}

async function getCoverUrl(comicPath: string, makeUrl: IMakeUrl) {
  try {
    const list = flatten(await buildComicImgList(comicPath, 2, makeUrl));
    return list[0] || list[1];
  } catch (e) {
    return null;
  }
}

interface ILibraryComic {
  // 只有新版本会有这个字段
  coverFileName?: string;
  // 压缩文件地址
  compressFilePath?: string;
  name: string;
  path: string;
  id: string;
  width: number;
  height: number;
  tag: string;
  position: string;
}

interface IComic extends ILibraryComic {
  cover: string;
}

export default class ComicService {
  private store!: Store<{
    library: Array<ILibraryComic>;
  }>;

  mainWindow: Electron.BrowserWindow;

  makeUrl: (filename: string) => string;

  constructor(
    mainWindow: any,
    makeUrl: ((filename: any) => string) | undefined
  ) {
    this.mainWindow = mainWindow;

    this.store = new Store({
      defaults: {
        library: [] as ILibraryComic[],
      },
    });
    // old version config file
    // 这里最终将会废弃
    try {
      const basePath = app.getPath("userData");
      const configPath = basePath;
      const configFilename = ".electron-webtton-comic.json";
      const configFileFullPath = path.resolve(configPath, configFilename);
      if (fs.existsSync(configFileFullPath)) {
        // migrate
        const { library } = JSON.parse(
          fs.readFileSync(configFileFullPath).toString()
        );
        this.store.set("library", library);
        fs.unlinkSync(configFileFullPath);
      }
    } catch (e) {
      console.log("migrate old config file error:", e);
    }

    this.makeUrl =
      makeUrl ||
      ((filename: string) => {
        return URL.pathToFileURL(filename).href;
      });
  }

  async getComicList(): Promise<IComic[]> {
    const library = this.store.get("library");
    return Promise.all(
      library.map(async (comic: ILibraryComic) => {
        if (comic.coverFileName) {
          return {
            ...comic,
            cover: this.makeUrl(comic.coverFileName),
          };
        }
        return {
          ...comic,
          cover: await getCoverUrl(comic.path, this.makeUrl),
        };
      })
    );
  }

  async getComicImgList(id: string) {
    // 如果配置文件不存在，则创建一个新的
    const library = this.store.get("library");
    const comics = library.filter((comic: ILibraryComic) => {
      return comic.id === id;
    });

    if (comics.length === 0) {
      const error = new Error();
      error.code = 404;
      throw error;
    }

    const comic = comics[0];
    const img = await buildComicImgList(comic.path, 100, this.makeUrl);
    const newimg = sortImgListByName(img);
    return newimg;
  }

  // 生成一个新的漫画书，包括id，预览图
  async buildNewComic(pathstr: string): Promise<ILibraryComic> {
    const ps = pathstr.split(path.sep);
    const coverUrl = await getCoverUrl(pathstr, (filename: string) => {
      return filename;
    });
    return await new Promise((resolve, reject) => {
      imageSize(coverUrl, (err: any, dimen: { width: any; height: any }) => {
        if (err) {
          console.log(coverUrl);
          reject(err);
          return;
        }
        resolve({
          path: pathstr,
          width: dimen.width,
          height: dimen.height,
          coverFileName: coverUrl,
          name: ps[ps.length - 1],
          id: uuidv4(),
        });
      });
    });
  }

  async getComic(id: string): Promise<ILibraryComic> {
    const library = this.store.get("library");
    return R.find(R.propEq("id", id), library);
  }

  isExistsAndTouch(comicPath: string) {
    const library = this.store.get("library");
    const index = R.findIndex(R.propEq("path", comicPath), library);

    if (index !== -1) {
      const newLibrary = [...library];
      newLibrary.splice(index, 1);
      this.store.set("library", [...newLibrary, library[index]]);
      return true;
    }
    return false;
  }

  async addComicToLibrary(comicpath: string) {
    if (!this.isExistsAndTouch(comicpath)) {
      const library = this.store.get("library");
      const newLibrary = (library || []).concat(
        await this.buildNewComic(comicpath)
      );
      this.store.set("library", newLibrary);
    }
  }

  // add compress file meta info to config
  async addComicToLibrary2(comicpath: string, compressFilePath: string) {
    if (!this.isExistsAndTouch(comicpath)) {
      const library = this.store.get("library");
      const newComic = await this.buildNewComic(comicpath);
      newComic.compressFilePath = compressFilePath;
      const newLibrary = (library || []).concat(newComic);
      this.store.set("library", newLibrary);
    }
  }

  // 打开文件选择对话框
  async takeDirectory() {
    return electron.dialog.showOpenDialog(this.mainWindow, {
      properties: ["openDirectory"],
    });
  }

  async takeCompressAndAddToComic() {
    const selectFile = await electron.dialog.showOpenDialog(this.mainWindow, {
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "compress", extensions: supportCompressExts }],
    });
    const cachePath = app.getPath("cache");

    const onEntry = (data) => {
      this.mainWindow.webContents.send("decompress", data);
    };

    if (!selectFile.canceled) {
      for (let i = 0; i < selectFile.filePaths.length; ++i) {
        const currentFile = selectFile.filePaths[i];
        decompress(currentFile, cachePath, onEntry, async (data) => {
          const { pathname } = data;
          await this.addComicToLibrary2(pathname, currentFile);
          this.mainWindow.webContents.send("decompress-done", data);
        });
      }
    }
  }

  /*
     删除一个漫画，如果是文件夹漫画，此时不会删除物理资源
     如果打开的是压缩包类型漫画，删除时会自动删除磁盘上解压的目录. 漫画字段包含 compressFilePath 则说明这是一个压缩包类型的漫画
   */
  async removeComic(id: string) {
    const comic = await this.getComic(id);

    if (comic.compressFilePath) {
      try {
        await fsPromisese.rmdir(comic.path, { recursive: true });
        this.mainWindow.webContents.send("msg", "已清理临时目录");
      } catch (e) {
        // pass
      }
    }

    const oldLibrary = this.store.get("library");
    const newLibrary = oldLibrary.filter((item) => {
      return item.id !== id;
    });
    this.store.set("library", newLibrary);
  }

  async get(key: string) {
    return this.store.get(`client/${key}`);
  }

  async set(key: string, value: any) {
    return this.store.set(`client/${key}`, value);
  }

  /* 更新阅读位置 name: 当前章节名, position: 当前章节的阅读位置 */
  async saveComicTag(id: string, { tag, position }) {
    let library = this.store.get("library");
    const comics = library.filter((item) => {
      return item.id === id;
    });
    if (comics.length) {
      comics[0].tag = tag;
      comics[0].position = position;

      library = library
        .map((item, index) => {
          return {
            ...item,
            index: item.id === id ? 9999999 : index,
          };
        })
        .sort((a, b) => {
          return a.index - b.index;
        });
    }
    this.store.set("library", library);
  }
}
