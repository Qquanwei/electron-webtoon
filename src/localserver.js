/* eslint-disable */
import Koa from 'koa';
import { app } from 'electron';
import Router from 'koa-router';
import fsPromisese from 'fs.promises';
import cors from '@koa/cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'koa-bodyparser';
import mime from 'mime-types';
import config from './config.json';
import { saveLocation } from './api';

const basePath = app.getPath('userData');
const configPath = basePath;

const configFilename = '.electron-webtton-comic.json';
const configFileFullPath = path.resolve(configPath, configFilename);

// config.library [Array<{id}>] 存放已经添加的漫画书

async function getConfig() {
  return JSON.parse(await fsPromisese.readFile(configFileFullPath));
}

async function saveConfig(config) {
  console.log('write config:', configFileFullPath);
  await fsPromisese.writeFile(
    configFileFullPath,
    JSON.stringify(config)
  );
}

async function getComicList(ctx, next) {
  if (fs.existsSync(configFileFullPath)) {
    const str = await fsPromisese.readFile(configFileFullPath);
    ctx.body = JSON.parse(str).library;
  } else {
    ctx.body = [];
  }
  await next();
}

function flatten(tree) {
  let list = [];
  for (let t of tree) {
    if (!t.name) {
      list.push(t);
    } else {
      list = list.concat(flatten(t.list));
    }
  }
  return list;
}

// 生成一个新的漫画书，包括id, 预览图
async function buildNewCommic(pathstr) {
  const ps = pathstr.split(path.sep);
  const list = flatten(await buildComicImgList(pathstr));
  return {
    path: pathstr,
    cover: list[1] || list[0],
    name: ps[ps.length - 1],
    id: uuidv4(),
  };
}

async function getComic(ctx, next) {
  // 如果配置文件不存在，则创建一个新的
  if (!fs.existsSync(configFileFullPath)) {
    ctx.status = 404;
    ctx.body = 'config not found';
  } else {
    const { id } = ctx.params;
    const configJSON = await getConfig();
    const comics = configJSON.library.filter((comic) => {
      return comic.id === id;
    });

    if (!comics.length === 0) {
      ctx.status = 404;
      ctx.body = 'not found';
    } else {
      ctx.body = comics[0];
    }
  }
  await next();
}

async function addComicToLibrary(ctx, next) {
  // 如果配置文件不存在，则创建一个新的
  if (!fs.existsSync(configFileFullPath)) {
    await saveConfig({
      library: [],
    });
  }

  try {
    const config = await getConfig();
    const oldLibrary = config?.library || [];
    const newComicItem = await buildNewCommic(ctx.request.body.path);
    const newLibrary = oldLibrary.concat(newComicItem);
    await saveConfig({
        ...config,
        library: newLibrary,
    });
    ctx.status = 200;
    ctx.body = {
      success: true,
    };
  } catch (e) {
    console.error(e);
  }
}

async function removeComic(ctx, next) {
  // 如果配置文件不存在，则创建一个新的
  if (!fs.existsSync(configFileFullPath)) {
    await fsPromisese.writeFile(
      configFileFullPath,
      JSON.stringify({
        library: [],
      })
    );
  }

  try {
    const { id } = ctx.params;
    const config = JSON.parse(await fsPromisese.readFile(configFileFullPath));
    const oldLibrary = config?.library || [];
    const newLibrary = oldLibrary.filter(item => {
      return item.id !== id;
    });
    await fsPromisese.writeFile(
      configFileFullPath,
      JSON.stringify({
        ...config,
        library: newLibrary,
      })
    );
    console.log('write config ', configFileFullPath);
    ctx.status = 200;
    ctx.body = {
      success: true,
    };
  } catch (e) {
    console.error(e);
  }
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

function isDirectory(fullpath) {
  return fs.lstatSync(fullpath).isDirectory();
}
async function buildComicImgList(pathname) {
  const files = await fsPromisese.readdir(pathname);

  const legalFiles = files.filter((file) => {
    return isDirectory(path.resolve(pathname, file)) || extNameLegal(file);
  });

  const result = [];
  for (let i = 0; i < legalFiles.length; ++i) {
    const fileOrDirName = legalFiles[i];
    if (isDirectory(path.resolve(pathname, fileOrDirName))) {
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

async function getComicImgList(ctx, next) {
  const { id } = ctx.params;
  // 如果配置文件不存在，则创建一个新的
  if (!fs.existsSync(configFileFullPath)) {
    ctx.status = 404;
    ctx.body = 'config not found';
  } else {
    const { id } = ctx.params;
    const config = await getConfig();
    const comics = config.library.filter((comic) => {
      return comic.id === id;
    });

    if (!comics.length === 0) {
      ctx.status = 404;
      ctx.body = 'not found';
    } else {
      const comic = comics[0];
      const imgList = await buildComicImgList(comic.path);
      ctx.body = imgList;
      ctx.status = 200;
    }
  }
}

async function responseImg(ctx, next) {
  const { p } = ctx.request.query;
  const { filename } = ctx.request.params;
  const ext = path.extname(filename);
  ctx.response.set('Content-Type', mime.lookup(ext));
  ctx.body = fs.createReadStream(p);
}

async function saveComicTag(ctx, next) {
  try {
    const { tag, id } = ctx.request.body;
    const config = await getConfig();
    const comics = config.library.filter(item => {
      return item.id === id;
    });

    if (comics.length === 0) {
      ctx.body = 'comic not found';
      ctx.status = 404;
    } else {
      comics[0].tag = tag;
      await saveConfig(config);
      ctx.status = 200;
      ctx.body = {
        success: true
      };
    }
} catch(e) {
  console.error(e);
}
}

export default async function hostServer() {
  const app = new Koa();
  const router = new Router();
  console.log('i think you are not eval')
  router
    .post('/bookmark', saveComicTag)
    .post('/comic', addComicToLibrary)
    .delete('/comic/:id', removeComic)
    .get('/imgproxy/:filename', responseImg)
    .get('/comic/:id/imglist', getComicImgList)
    .get('/comic/:id', getComic)
    .get('/comic', getComicList)

  app.use(cors());
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  const server = app.listen(config.localserverport);
  console.log('start localserver success');
  return server;
}
