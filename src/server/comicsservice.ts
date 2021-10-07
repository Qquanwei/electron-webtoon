import { app } from 'electron';
import * as R from 'ramda';
import path from 'path';
import fsP from 'fs/promises';
import fsPromisese from 'fs.promises';

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

async function buildComicImgList(pathname: string) {
  const files = await fsPromisese.readdir(pathname);

  const legalFiles = files.filter((file) => {
    return isDirectory(path.resolve(pathname, file)) || extNameLegal(file);
  });

  const result = [];
  for (let i = 0; i < legalFiles.length; i += 1) {
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
      const ext = path.extname(fileOrDirName);
      const url = `http://localhost:${
        config.localserverport
      }/imgproxy/transparent${ext}?p=${encodeURIComponent(
        path.resolve(pathname, fileOrDirName)
      )}`;
      result.push(url);
    }
  }
  return result;
}

export default class ComicService {
  constructor() {
    this.basePath = app.getPath('userData');
    this.configPath = basePath;
    this.configFilename = '.electron-webtton-comic.json';
    this.configFileFullPath = path.resolve(configPath, configFilename);
  }

  private async ensureConfigExists() {
    const exists = await fsP.exists(this.configFileFullPath);

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
      return JSON.parse(str).library;
    }
    return [];
  }

  // 生成一个新的漫画书，包括id，预览图
  async buildNewComic(pathstr: string) {
    const ps = pathstr.split(path.sep);
    const list = flatten(await buildComicImgList(pathstr));
    return {
      path: pathstr,
      cover: list[1] || list[0],
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
    (config.library || []).concat(await this.buildNewComic(comicpath));
  }
}
