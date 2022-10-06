interface IMakeUrl {
  (url: string): string;
}

type IComicImgList = Array<string | { name: string; list: IComicImgList }>;
