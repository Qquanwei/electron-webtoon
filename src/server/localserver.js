/* eslint-disable */
import Koa from 'koa';
import https from 'https';
import http from 'http';
import path from 'path';
import fs from 'fs';
import Router from 'koa-router';
import KoaStatic from 'koa-static';
import cors from '@koa/cors';
import mime from 'mime-types';
import bodyParser from 'koa-bodyparser';
import ComicController from './comiccontroller';
import config from './config.json';

function responseIMG(ctx) {
  const { url } = ctx.request.query;
  const ext = path.extname(url);
  ctx.response.set('Content-Type', mime.lookup(ext));
  ctx.body = fs.createReadStream(url);
}

export default async function hostServer(mainWindow, address) {
  const app = new Koa();
  const router = new Router();

  function makeUrl(filename) {
    return `http://${address}:${config.localserverport}/img?url=${encodeURIComponent(filename)}`;
  }
  const controller = new ComicController(mainWindow, makeUrl);
  router
    .put('/bookmark', controller.saveComicTag.bind(controller))
    .post('/comic', controller.addComicToLibrary.bind(controller))
    .delete('/comic/:id', controller.removeComic.bind(controller))
    .get('/comic/:id/imglist', controller.getComicImgList.bind(controller))
    .get('/comic/:id', controller.getComic.bind(controller))
    .get('/comic', controller.getComicList.bind(controller))
    .get('/take-directory', controller.takeDirectory.bind(controller))
    .get('/img', responseIMG)

  app.use(cors());
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  // dev and prod mode index.html has difference path
  if (process.env.NODE_ENV !== 'development') {
    app.use(KoaStatic(path.resolve(__dirname, './')));
  } else {
    app.use(KoaStatic(path.resolve(__dirname, '../')));
  }

  return http.createServer(
    app.callback()
  ).listen({
    host: '0.0.0.0',
    port: config.localserverport
  }, () => {
    console.log('本地服务已开启');
  });
}
