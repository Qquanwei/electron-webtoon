import ComicService from './comicsservice';

export default class ComicController {
  constructor() {
    this.service = new ComicService();
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

  async addComicToLibrary() {
    const { path } = ctx.request.body;
    await this.service.addComicToLibrary(path);
    ctx.status = 200;
  }

  async getComicImgList(ctx) {
    const { id } = ctx.params;
  }
}
