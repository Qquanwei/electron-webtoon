/* eslint-disable */
import Koa from 'koa';
import { app } from 'electron';
import Router from 'koa-router';
import fsPromisese from 'fs.promises';
import cors from '@koa/cors';
import fs from 'fs';
import path from 'path';
import bodyParser from 'koa-bodyparser';
import mime from 'mime-types';
import ComicController from './comiccontroller';
import config from './config.json';

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

export default async function hostServer(mainWindow) {
  const app = new Koa();
  const router = new Router();
  const controller = new ComicController(mainWindow);
  router
    .post('/bookmark', saveComicTag)
    .post('/comic', controller.addComicToLibrary.bind(controller))
    .delete('/comic/:id', removeComic)
    .get('/comic/:id/imglist', controller.getComicImgList.bind(controller))
    .get('/comic/:id', controller.getComic.bind(controller))
    .get('/comic', getComicList)
    .get('/take-directory', controller.takeDirectory.bind(controller));

  app.use(cors());
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  const server = app.listen(config.localserverport);
  console.log('start localserver success');
  return server;
}
