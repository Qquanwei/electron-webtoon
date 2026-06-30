/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
import electron, { app } from "electron";
import imageSize from "image-size";
import { v4 as uuidv4 } from "uuid";
import * as R from "ramda";
import path from "path";
import fs from "fs";
import fsPromisese from "fs/promises";
import Store from "electron-store";
import decompress from "./compress";
import sortImgListByName from "./sortImgListByName";
import {
  DEFAULT_SHORTCUT_BINDINGS,
  serializeShortcutBindings,
} from "../shared/shortcuts";
import { IDecompressProgress, IDLE_DECOMPRESS_PROGRESS } from "../shared/type";
import { emitAppEvent } from "../shared/ipc/events";
import { getComicReadProgressPercent } from "../shared/comicReadProgress";
import { flattenImgList } from "../shared/flattenImgList";
import { makeComicFileUrl, COMIC_FILE_SCHEME } from "./comic-file-protocol";

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

interface IStoreKeys {
  decompressPath: string;
  archivePath: string;
  shortcuts: string;
}

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

// 递归复制文件或文件夹
async function copyFileOrDirectory(
  source: string,
  destination: string,
): Promise<void> {
  try {
    const stat = await fsPromisese.stat(source);

    if (stat.isDirectory()) {
      // 创建目标目录
      await fsPromisese.mkdir(destination, { recursive: true });
      // 读取源目录内容
      const files = await fsPromisese.readdir(source);
      // 递归复制每个文件/文件夹
      for (const file of files) {
        const srcPath = path.join(source, file);
        const dstPath = path.join(destination, file);
        await copyFileOrDirectory(srcPath, dstPath);
      }
    } else {
      // 复制文件
      console.log(`Copying file: ${source} -> ${destination}`);
      await fsPromisese.copyFile(source, destination);
    }
  } catch (error) {
    console.error(`Error copying ${source} to ${destination}:`, error);
    throw error;
  }
}

// deep 子文件夹个数
async function buildComicImgList(
  pathname: string,
  deep = 1000,
  makeUrl: IMakeUrl,
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
        makeUrl,
      );

      if (list.length) {
        const isPureImgList = list.every((item) => {
          return typeof item === "string";
        });
        if (isPureImgList) {
          result.push({
            name: fileOrDirName,
            list,
          });
        } else {
          result.push(...list);
        }
      }
    } else {
      singlePics.push(makeUrl(path.resolve(pathname, fileOrDirName)));
    }
  }
  if (result.length === 0) {
    return singlePics;
  }

  if (singlePics.length) {
    return [
      {
        name: "无目录-1",
        list: singlePics,
      },
    ].concat(result as any);
  }

  return result;
}

async function getCoverUrl(comicPath: string, makeUrl: IMakeUrl) {
  try {
    const list = flatten(await buildComicImgList(comicPath, 3, makeUrl));
    return list[0] || list[1];
  } catch (e) {
    return null;
  }
}

const PREVIEW_COUNT = 10;

interface ILibraryComic {
  // 只有新版本会有这个字段
  coverFileName?: string;
  // 压缩文件地址
  compressFilePath?: string;
  /** 首页轮播预览图本地路径 */
  previewFileNames?: string[];
  /** 阅读进度 0–100 */
  readProgressPercent?: number;
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
  private store!: Store<
    {
      library: Array<ILibraryComic>;
    } & IStoreKeys
  >;

  mainWindow: Electron.BrowserWindow;

  makeUrl: (filename: string) => string;

  constructor(
    mainWindow: any,
    makeUrl?: ((filename: any) => string) | undefined,
  ) {
    this.mainWindow = mainWindow;

    this.store = new Store({
      name: "config",
      defaults: {
        library: [] as ILibraryComic[],
        decompressPath: app.getPath("appData"),
        archivePath: "",
        shortcuts: serializeShortcutBindings(DEFAULT_SHORTCUT_BINDINGS),
      },
    });

    this.makeUrl = makeUrl || makeComicFileUrl;
  }

  private resolveFileRef(fileRef: string): string {
    if (!fileRef) {
      return fileRef;
    }

    if (fileRef.startsWith(`${COMIC_FILE_SCHEME}://`)) {
      try {
        const url = new URL(fileRef);
        return decodeURIComponent(url.searchParams.get("path") ?? fileRef);
      } catch {
        return fileRef;
      }
    }

    return fileRef;
  }

  private toPreviewUrls(previewFileNames?: string[]) {
    if (!previewFileNames?.length) {
      return undefined;
    }

    const previewUrls = previewFileNames
      .map((fileName) => this.makeUrl(this.resolveFileRef(fileName)))
      .filter(Boolean);

    return previewUrls.length ? previewUrls : undefined;
  }

  private async ensurePreviewFileNames(
    comic: ILibraryComic,
  ): Promise<string[] | undefined> {
    const normalized = comic.previewFileNames?.map((fileName) =>
      this.resolveFileRef(fileName),
    );
    const hasStoredPreview = Boolean(normalized?.length);
    const needsMigration = comic.previewFileNames?.some((fileName) =>
      fileName.startsWith(`${COMIC_FILE_SCHEME}://`),
    );

    if (hasStoredPreview && !needsMigration) {
      return normalized;
    }

    let previewFileNames = normalized;

    if (!previewFileNames?.length) {
      try {
        const imgList = sortImgListByName(
          await buildComicImgList(comic.path, 100, (filename) => filename),
        );
        const flatPages = flattenImgList(imgList);
        if (flatPages.length) {
          previewFileNames = flatPages
            .slice(0, PREVIEW_COUNT)
            .map((page) => this.resolveFileRef(page));
        }
      } catch (error) {
        console.warn("preview backfill failed:", comic.id, error);
      }
    }

    if (!previewFileNames?.length) {
      return undefined;
    }

    if (
      needsMigration ||
      !hasStoredPreview ||
      comic.previewFileNames?.some(
        (fileName, index) => fileName !== previewFileNames![index],
      )
    ) {
      comic.previewFileNames = previewFileNames;
      const library = this.store.get("library");
      const target = library.find((item) => item.id === comic.id);
      if (target) {
        target.previewFileNames = previewFileNames;
        this.store.set("library", library);
      }
    }

    return previewFileNames;
  }

  async getComicList(): Promise<IComic[]> {
    const library = this.store.get("library");
    return Promise.all(library.map((comic) => this.toPublicComic(comic)));
  }

  private async toPublicComic(comic: ILibraryComic): Promise<IComic> {
    let cover = "";
    if (comic.coverFileName) {
      cover = this.makeUrl(this.resolveFileRef(comic.coverFileName));
    } else {
      cover = (await getCoverUrl(comic.path, this.makeUrl)) || "";
    }

    const previewFileNames = await this.ensurePreviewFileNames(comic);
    const previewUrls = this.toPreviewUrls(previewFileNames);

    return {
      ...comic,
      cover,
      previewUrls,
    };
  }

  private syncComicLibraryMetadata(
    comic: ILibraryComic,
    imgList: ReturnType<typeof sortImgListByName>,
  ) {
    const flatPages = flattenImgList(imgList);
    let changed = false;

    if (!comic.previewFileNames?.length && flatPages.length) {
      comic.previewFileNames = flatPages
        .slice(0, PREVIEW_COUNT)
        .map((page) => this.resolveFileRef(page));
      changed = true;
    }

    const hasBookmark =
      (comic.tag && comic.tag.trim() !== "") ||
      (comic.position != null &&
        String(comic.position) !== "" &&
        Number(comic.position) > 0);

    if (comic.readProgressPercent == null && hasBookmark) {
      comic.readProgressPercent = getComicReadProgressPercent(
        { tag: comic.tag, position: comic.position },
        imgList,
      );
      changed = true;
    }

    return changed;
  }

  private persistLibraryMetadata(
    id: string,
    imgList: ReturnType<typeof sortImgListByName>,
  ) {
    const library = this.store.get("library");
    const comic = library.find((item) => item.id === id);
    if (!comic) {
      return;
    }

    if (this.syncComicLibraryMetadata(comic, imgList)) {
      this.store.set("library", library);
    }
  }

  async getComicImgList(id: string) {
    // 如果配置文件不存在，则创建一个新的
    const library = this.store.get("library");
    const comics = library.filter((comic: ILibraryComic) => {
      return comic.id === id;
    });

    if (comics.length === 0) {
      const error = new Error();
      (error as any).code = 404;
      throw error;
    }

    const comic = comics[0];
    const img = await buildComicImgList(comic.path, 100, this.makeUrl);
    const newimg = sortImgListByName(img);
    this.persistLibraryMetadata(id, newimg);
    return newimg;
  }

  // 生成一个新的漫画书，包括id，预览图
  async buildNewComic(pathstr: string): Promise<ILibraryComic> {
    const ps = pathstr.split(path.sep);
    const imgList = sortImgListByName(
      await buildComicImgList(pathstr, 100, (filename: string) => filename),
    );
    const flatPages = flattenImgList(imgList);
    const coverUrl = flatPages[0] || flatPages[1] || null;
    const previewFileNames = flatPages.slice(0, PREVIEW_COUNT);

    return await new Promise((resolve, reject) => {
      imageSize(
        coverUrl || "",
        (err: any, dimen: { width: any; height: any }) => {
          if (err) {
            console.log(coverUrl);
            reject(err);
            return;
          }
          resolve({
            path: pathstr,
            width: dimen.width,
            height: dimen.height,
            coverFileName: coverUrl || undefined,
            previewFileNames: previewFileNames.length
              ? previewFileNames
              : undefined,
            readProgressPercent: 0,
            name: ps[ps.length - 1],
            id: uuidv4(),
          });
        },
      );
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
        await this.buildNewComic(comicpath),
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

    if (!selectFile.canceled && selectFile.filePaths.length) {
      const cachePath = this.store.get("decompressPath");
      await this.processArchiveFiles(selectFile.filePaths, cachePath);
    }
  }

  private lastProgressSentAt = 0;

  private sendDecompressProgress(payload: IDecompressProgress) {
    const now = Date.now();
    if (
      payload.active &&
      now - this.lastProgressSentAt < 80 &&
      payload.percent < 100
    ) {
      return;
    }
    this.lastProgressSentAt = now;
    emitAppEvent(this.mainWindow, {
      type: "decompress-progress",
      payload,
    });
  }

  private async processArchiveFiles(
    files: string[],
    cachePath: string,
  ): Promise<void> {
    const archiveTotal = files.length;

    this.sendDecompressProgress({
      active: true,
      archiveIndex: 0,
      archiveTotal,
      archiveName: path.basename(files[0]),
      entryProcessed: 0,
      entryTotal: 0,
      percent: 0,
    });

    for (let archiveIndex = 0; archiveIndex < files.length; archiveIndex += 1) {
      const currentFile = files[archiveIndex];
      const archiveName = path.basename(currentFile);

      try {
        await decompress(
          currentFile,
          cachePath,
          (message) => {
            emitAppEvent(this.mainWindow, {
              type: "decompress",
              payload: message,
            });
          },
          async (data) => {
            const { pathname } = data;
            await this.addComicToLibrary2(pathname, currentFile);
            emitAppEvent(this.mainWindow, {
              type: "decompress-done",
              payload: data,
            });
          },
          ({ processed, total }) => {
            const archiveFraction = total > 0 ? processed / total : 0;
            const percent = Math.min(
              100,
              ((archiveIndex + archiveFraction) / archiveTotal) * 100,
            );

            this.sendDecompressProgress({
              active: true,
              archiveIndex,
              archiveTotal,
              archiveName,
              entryProcessed: processed,
              entryTotal: total,
              percent,
            });
          },
        );
      } catch (error) {
        console.error("processArchiveFiles error:", error);
      }
    }

    this.sendDecompressProgress({
      active: true,
      archiveIndex: archiveTotal - 1,
      archiveTotal,
      archiveName: "",
      entryProcessed: 0,
      entryTotal: 0,
      percent: 100,
    });

    setTimeout(() => {
      this.sendDecompressProgress(IDLE_DECOMPRESS_PROGRESS);
    }, 800);
  }

  /**
   * Handle files/paths dropped into the app.
   * Accepts directories or compress files. Directories will be added as comics.
   * Compress files will be decompressed to the configured cache and added.
   */
  async handleDroppedFiles(paths: string[]) {
    if (!paths || !paths.length) return;
    const cachePath = this.store.get("decompressPath");
    const compressFiles: string[] = [];

    for (let i = 0; i < paths.length; i += 1) {
      const p = paths[i];
      try {
        if (isDirectory(p)) {
          await this.addComicToLibrary(p);
          emitAppEvent(this.mainWindow, {
            type: "decompress-done",
            payload: { pathname: p },
          });
          continue;
        }

        const lower = p.toLowerCase();
        const isCompress = supportCompressExts.some((s) =>
          lower.endsWith(`.${s}`),
        );
        if (isCompress) {
          compressFiles.push(p);
        }
      } catch (e) {
        console.error("handleDroppedFiles error:", e);
      }
    }

    if (compressFiles.length) {
      await this.processArchiveFiles(compressFiles, cachePath);
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
        emitAppEvent(this.mainWindow, {
          type: "msg",
          payload: "已清理临时目录",
        });
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

  /*
     归档一个漫画，将源文件移动到归档路径，并从库中删除
     如果是压缩包类型漫画（有compressFilePath），则移动源压缩文件
     如果是文件夹漫画，则移动文件夹
   */
  async archiveComic(id: string) {
    const comic = await this.getComic(id);
    const archivePath = this.store.get("archivePath");

    if (!comic || !archivePath) {
      throw new Error("漫画不存在或未配置归档路径");
    }

    try {
      let sourcePathToArchive: string;
      let fileName: string;

      // 如果是压缩包类型漫画，归档源压缩文件
      if (comic.compressFilePath) {
        sourcePathToArchive = comic.compressFilePath;
        const ps = sourcePathToArchive.split(path.sep);
        fileName = ps[ps.length - 1];
      } else {
        // 否则归档漫画文件夹
        sourcePathToArchive = comic.path;
        const ps = sourcePathToArchive.split(path.sep);
        fileName = ps[ps.length - 1];
      }

      const targetPath = path.resolve(archivePath, fileName);

      // 如果目标路径已存在，则添加时间戳
      let finalTargetPath = targetPath;
      let counter = 1;
      while (fs.existsSync(finalTargetPath)) {
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));
        const ext = fileName.substring(fileName.lastIndexOf("."));
        finalTargetPath = path.resolve(
          archivePath,
          `${nameWithoutExt}_${counter}${ext}`,
        );
        counter++;
      }

      // 移动文件或文件夹
      // 首先尝试使用 rename，如果失败（如跨磁盘）则使用复制+删除
      let moved = false;
      try {
        await fsPromisese.rename(sourcePathToArchive, finalTargetPath);
        moved = true;
      } catch (renameError: any) {
        console.warn("Rename failed, attempting copy+delete:", renameError);
        // 如果是跨设备错误，使用复制+删除的方式
        if (
          renameError.code === "EXDEV" ||
          renameError.errno === -18 ||
          renameError.message.includes("cross-device") ||
          renameError.message.includes("EXDEV")
        ) {
          console.log("Cross-device detected, using copy+delete method");
          try {
            // 复制文件/文件夹
            await copyFileOrDirectory(sourcePathToArchive, finalTargetPath);
            // 删除源文件/文件夹
            if (fs.lstatSync(sourcePathToArchive).isDirectory()) {
              await fsPromisese.rmdir(sourcePathToArchive, { recursive: true });
            } else {
              await fsPromisese.unlink(sourcePathToArchive);
            }
            moved = true;
          } catch (copyError) {
            console.error("Copy+delete failed:", copyError);
            throw new Error(`跨磁盘移动失败：${(copyError as any).message}`);
          }
        } else {
          throw new Error(`移动失败：${renameError.message}`);
        }
      }

      if (!moved) {
        throw new Error("文件移动失败，请检查路径和权限");
      }

      // 如果是压缩包类型漫画，还要删除解压的临时目录
      if (comic.compressFilePath) {
        try {
          await fsPromisese.rmdir(comic.path, { recursive: true });
        } catch (e) {
          // 如果删除失败，继续，因为主要文件已经归档
          console.warn("Failed to remove temporary directory:", e);
        }
      }

      emitAppEvent(this.mainWindow, {
        type: "msg",
        payload: `已归档至：${finalTargetPath}`,
      });
    } catch (e) {
      console.error("Archive comic error:", e);
      throw new Error(`归档失败：${(e as any).message}`);
    }

    // 从库中删除该漫画
    const oldLibrary = this.store.get("library");
    const newLibrary = oldLibrary.filter((item) => {
      return item.id !== id;
    });
    this.store.set("library", newLibrary);
  }

  async get(key: keyof IStoreKeys): Promise<string> {
    return this.store.get(`${key}`);
  }

  async set(key: keyof IStoreKeys, value: string) {
    return this.store.set(`${key}`, value);
  }

  async reset(key: keyof IStoreKeys) {
    if (key === "decompressPath") {
      return this.store.reset("decompressPath");
    }
    if (key === "archivePath") {
      return this.store.set("archivePath", "");
    }
    if (key === "shortcuts") {
      return this.store.set(
        "shortcuts",
        serializeShortcutBindings(DEFAULT_SHORTCUT_BINDINGS),
      );
    }
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

      try {
        const img = await buildComicImgList(comics[0].path, 100, this.makeUrl);
        const imgList = sortImgListByName(img);
        comics[0].readProgressPercent = getComicReadProgressPercent(
          { tag, position },
          imgList,
        );
        if (!comics[0].previewFileNames?.length) {
          comics[0].previewFileNames = flattenImgList(imgList)
            .slice(0, PREVIEW_COUNT)
            .map((page) => this.resolveFileRef(page));
        }
      } catch (error) {
        console.warn("saveComicTag progress update failed:", error);
      }

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

  /**
   * 设置漫画书属性
   * @param id
   * @param property
   */
  async setComicProperty(id: string, property: string, value: string) {
    let library = this.store.get("library");
    const comics = library.filter((item) => {
      return item.id === id;
    });
    if (comics.length) {
      (comics[0] as any)[property] = value;

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
