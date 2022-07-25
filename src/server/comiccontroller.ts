import ComicService from './comicsservice';

export default class ComicController {
  constructor(mainWindow, makeUrl) {
    this.service = new ComicService(mainWindow, makeUrl);
  }

  async get(ctx) {
    const params = JSON.parse(ctx.request.body);
    ctx.body = await this.service.get(params.key);
  }

  async set(ctx) {
    const params = JSON.parse(ctx.request.body);
    ctx.body = await this.service.set(params.key, params.value);
  }

  async getConfig(ctx, next) {
    ctx.body = await this.service.getConfig();
  }

  async saveConfig(ctx) {
    const config = JSON.parse(ctx.request.body);
    ctx.body = await this.service.saveConfig(config);
  }

  async getComicList(ctx) {
    ctx.body = await this.service.getComicList();
  }

  // params: id
  async getComic(ctx) {
    const { id } = ctx.params;
    const comic = await this.service.getComic(id);
    if (comic === null) {
      ctx.status = 404;
      ctx.body = 'comic not found';
    } else {
      ctx.body = comic;
    }
  }

  async addComicToLibrary(ctx) {
    const { path } = ctx.request.body;
    await this.service.addComicToLibrary(path);
    ctx.status = 200;
    ctx.body = {};
  }

  async getComicImgList(ctx) {
    const { id } = ctx.params;
    try {
      ctx.body = await this.service.getComicImgList(id);
    } catch (e) {
      ctx.status = 404;
    }
  }

  async takeDirectory(ctx) {
    ctx.body = await this.service.takeDirectory();
  }

  async removeComic(ctx) {
    const { id } = ctx.params;
    await this.service.removeComic(id);
    ctx.status = 200;
    ctx.body = {};
  }

  async saveComicTag(ctx) {
    const { tag, position, id } = ctx.request.body;
    this.service.saveComicTag(id, { tag, position });
    ctx.status = 200;
    ctx.body = {};
  }
}
