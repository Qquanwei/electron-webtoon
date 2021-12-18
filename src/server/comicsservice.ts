/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
import electron, { app } from 'electron';

import URL from 'url';
import { v4 as uuidv4 } from 'uuid';
import * as R from 'ramda';
import path from 'path';
import fs from 'fs';
import fsPromisese from 'fs.promises';

function isDirectory(fullpath) {
  return fs.lstatSync(fullpath).isDirectory();
}

const supportExts = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.apng',
  '.avif',
  '.tiff',
];

function extNameLegal(file) {
  const ext = path.extname(file);
  return supportExts.includes(ext);
}

function flatten(tree) {
  let list = [];
  // eslint-disable-next-line
  for (const t of tree) {
    if (!t.name) {
      list.push(t);
    } else {
      list = list.concat(flatten(t.list));
    }
  }
  return list;
}

// deep 子文件夹个数
async function buildComicImgList(pathname: string, deep = 1000) {
  const files = await fsPromisese.readdir(pathname);

  const legalFiles = files.filter((file) => {
    return isDirectory(path.resolve(pathname, file)) || extNameLegal(file);
  });

  const result = [];
  for (let i = 0; i < legalFiles.length && deep--; i += 1) {
    const fileOrDirName = legalFiles[i];
    if (isDirectory(path.resolve(pathname, fileOrDirName))) {
      // eslint-disable-next-line
      const list = await buildComicImgList(
        path.resolve(pathname, fileOrDirName)
      );
      result.push({
        name: fileOrDirName,
        list,
      });
    } else {
      const url = URL.pathToFileURL(path.resolve(pathname, fileOrDirName));
      result.push(url.href);
    }
  }
  return result;
}

async function getCoverUrl(comicPath) {
  const list = flatten(await buildComicImgList(comicPath, 1));
  return list[0] || list[1];
}

export default class ComicService {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.basePath = app.getPath('userData');
    this.configPath = this.basePath;
    this.configFilename = '.electron-webtton-comic.json';
    this.configFileFullPath = path.resolve(
      this.configPath,
      this.configFilename
    );
  }

  private async ensureConfigExists() {
    const exists = fs.existsSync(this.configFileFullPath);

    if (exists) {
      return;
    }

    throw new Error('配置文件不存在');
  }

  async getConfig() {
    return JSON.parse(await fsPromisese.readFile(this.configFileFullPath));
  }

  async saveConfig(config: any) {
    console.log('write config:', this.configFileFullPath);
    await fsPromisese.writeFile(
      this.configFileFullPath,
      JSON.stringify(config)
    );
  }

  async getComicList() {
    if (fs.existsSync(this.configFileFullPath)) {
      const str = await fsPromisese.readFile(this.configFileFullPath);
      const { library } = JSON.parse(str);
      return Promise.all(
        library.map(async (comic) => {
          return {
            ...comic,
            cover: await getCoverUrl(comic.path),
          };
        })
      );
    }
    return [];
  }

  async getComicImgList(id) {
    // 如果配置文件不存在，则创建一个新的
    if (!fs.existsSync(this.configFileFullPath)) {
      const error = new Error();
      error.code = 404;
      throw error;
    } else {
      const config = await this.getConfig();
      const comics = config.library.filter((comic) => {
        return comic.id === id;
      });

      if (!comics.length === 0) {
        const error = new Error();
        error.code = 404;
        throw error;
      } else {
        const comic = comics[0];
        return await buildComicImgList(comic.path);
      }
    }
  }

  // 生成一个新的漫画书，包括id，预览图
  async buildNewComic(pathstr: string) {
    const ps = pathstr.split(path.sep);
    return {
      path: pathstr,
      cover: await getCoverUrl(pathstr),
      name: ps[ps.length - 1],
      id: uuidv4(),
    };
  }

  async getComic(id) {
    await this.ensureConfigExists();
    const config = await this.getConfig();
    return R.find(R.propEq('id', id), config.library);
  }

  async addComicToLibrary(comicpath: string) {
    await this.ensureConfigExists();
    const config = await this.getConfig();
    const newLibrary = (config.library || []).concat(
      await this.buildNewComic(comicpath)
    );
    await this.saveConfig({
      ...config,
      library: newLibrary,
    });
  }

  // 打开文件选择对话框
  async takeDirectory() {
    return electron.dialog.showOpenDialog(this.mainWindow, {
      properties: ['openDirectory'],
    });
  }

  async removeComic(id) {
    // 如果配置文件不存在，则创建一个新的
    if (!fs.existsSync(this.configFileFullPath)) {
      await fsPromisese.writeFile(
        this.configFileFullPath,
        JSON.stringify({
          library: [],
        })
      );
    }

    const config = JSON.parse(
      await fsPromisese.readFile(this.configFileFullPath)
    );
    const oldLibrary = config?.library || [];
    const newLibrary = oldLibrary.filter((item) => {
      return item.id !== id;
    });
    await fsPromisese.writeFile(
      this.configFileFullPath,
      JSON.stringify({
        ...config,
        library: newLibrary,
      })
    );
    console.log('write config ', this.configFileFullPath);
  }

  async saveComicTag(id, name) {
    const config = await this.getConfig();
    const comics = config.library.filter((item) => {
      return item.id === id;
    });

    comics[0].tag = name;
    await this.saveConfig(config);
  }
}
