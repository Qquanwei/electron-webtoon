/* eslint-disable */
import Koa from 'koa';
import { app } from 'electron';
import Router from 'koa-router';
import fsPromisese from 'fs.promises';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bodyParser from 'koa-bodyparser';
import mime from 'mime-types';
import config from './config.json';

const basePath = app.getPath('userData');
const configPath = basePath;

const configFilename = '.electron-webtton-comic.json';
const configFileFullPath = path.resolve(configPath, configFilename);

// config.library [Array<string>] 存放已经添加的漫画书

async function getComicList(ctx, next) {
  if (fs.existsSync(configFileFullPath)) {
    const str = await fsPromisese.readFile(configFileFullPath);
    ctx.body = JSON.parse(str).library;
  } else {
    ctx.body = [];
  }
  await next();
}

// 生成一个新的漫画书，包括id, 预览图
async function buildNewCommic(pathstr) {
  const ps = pathstr.split(path.sep);
  return {
    path: pathstr,
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
    const configJSON = JSON.parse(
      await fsPromisese.readFile(configFileFullPath)
    );
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
    await fsPromisese.writeFile(
      configFileFullPath,
      JSON.stringify({
        library: [],
      })
    );
  }

  try {
    const config = JSON.parse(await fsPromisese.readFile(configFileFullPath));
    const oldLibrary = config?.library || [];
    const newComicItem = await buildNewCommic(ctx.request.body.path);
    const newLibrary = oldLibrary.concat(newComicItem);
    await fsPromisese.writeFile(
      configFileFullPath,
      JSON.stringify({
        ...config,
        library: newLibrary,
      })
    );
    console.log('写入配置 ', configFileFullPath);
    ctx.status = 200;
    ctx.body = {
      success: true,
    };
  } catch (e) {
    console.error(e);
  }

  await next();
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
    const config = JSON.parse(await fsPromisese.readFile(configFileFullPath));
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
  await next();
}

async function responseImg(ctx, next) {
  const { p } = ctx.request.query;
  const { filename } = ctx.request.params;
  const ext = path.extname(filename);
  ctx.response.set('Content-Type', mime.lookup(ext));
  ctx.body = fs.createReadStream(p);
  await next();
}

export default async function hostServer() {
  const app = new Koa();
  const router = new Router();
  router
    .get('/imgproxy/:filename', responseImg)
    .get('/comic/:id/imglist', getComicImgList)
    .get('/comic/:id', getComic)
    .get('/comic', getComicList)
    .post('/comic', addComicToLibrary);
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  const server = app.listen(config.localserverport);
  console.log('启动本地服务成功');
  return server;
}
