/**
 * 一元函数
 */
export type UnaryFunction<T, K = unknown> = (value: T) => K;
/**
 * 零元函数
 */
export type EmptyFunction<K = void> = () => K;

export interface Path {
  canceled?: boolean;
  filePaths?: string[];
}

export interface IPC {
  /**
   * 订阅来自node的消息
   */
  onMsg: UnaryFunction<UnaryFunction<string, void>, void>;

  /**
   * 开始解压缩
   */
  onCompressFile: UnaryFunction<UnaryFunction<string, void>, void>;

  /**
   * 解压缩成功
   */
  onCompressDone: UnaryFunction<UnaryFunction<string, void>, void>;

  /**
   * 选择压缩包文件并添加到漫画列表中
   */
  takeCompressAndAddToComic: EmptyFunction;
  /**
   * 将该一个目录作为漫画，加到漫画列表中
   */
  addComicToLibrary: UnaryFunction<string, Promise<unknown>>;
  /**
   * 选择一个目录
   */
  takeDirectory: EmptyFunction<Promise<Path>>;

  /**
   * 添加日志
   */
  addLog: (type: "info", log: string) => Promise<unknown>;

  /**
   * 根据comicId 删除一个漫画
   */
  removeComic: UnaryFunction<string, Promise<unknown>>;

  /**
   * get client config value by key
   */
  get: (key: string) => Promise<any>;

  /**
   * set client config value by key
   */
  set: (key: string, value: any) => Promise<unknown>;

  /**
   * reset client config value by key to default
   */
  reset: (key: string) => Promise<any>;

  /**
   * handle files/paths dropped into the app (folders or archive files)
   */
  handleDroppedFiles: (paths: string[]) => Promise<any>;

  fetchComicList: EmptyFunction<Promise<IComic[]>>;

  fetchComic: UnaryFunction<string, Promise<IComic>>;

  fetchImgList: UnaryFunction<string, Promise<IImgList>>;

  saveComicTag: (
    id: string,
    name: string,
    position: string | number,
  ) => unknown;

  setComicProperty: (id: string, property: string, value: string) => unknown;

  /**
   * 收藏绝景
   */
  // saveUnbelieveView: EmptyFunction;
}

export interface IComic {
  id: string;
  tag: string;
  cover: string;
  name: string;
  width: number;
  height: number;
  position: string | number;
  /**
   * 横竖屏翻页模式
   */
  pageMode?: "horizon" | "vertical";
}

export interface IChapter {
  name: string;
  list: IImgListForSingleChapter | IImgListForMultipleChapter;
}
export type IImgListForSingleChapter = string[];
export type IImgListForMultipleChapter = IChapter[];

export type IImgList = IImgListForMultipleChapter | IImgListForSingleChapter;
