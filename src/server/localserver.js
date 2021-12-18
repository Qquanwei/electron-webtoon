/* eslint-disable */
import Koa from 'koa';
import Router from 'koa-router';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import ComicController from './comiccontroller';
import config from './config.json';

export default async function hostServer(mainWindow) {
  const app = new Koa();
  const router = new Router();
  const controller = new ComicController(mainWindow);
  router
    .put('/bookmark', controller.saveComicTag.bind(controller))
    .post('/comic', controller.addComicToLibrary.bind(controller))
    .delete('/comic/:id', controller.removeComic.bind(controller))
    .get('/comic/:id/imglist', controller.getComicImgList.bind(controller))
    .get('/comic/:id', controller.getComic.bind(controller))
    .get('/comic', controller.getComicList.bind(controller))
    .get('/take-directory', controller.takeDirectory.bind(controller));

  app.use(cors());
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  const server = app.listen(config.localserverport);
  console.log('start localserver success');
  return server;
}
