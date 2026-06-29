import { IImgList } from "./type";

export function flattenImgList(imgList: IImgList): string[] {
  const result: string[] = [];

  const walk = (items: IImgList) => {
    for (const item of items) {
      if (typeof item === "string") {
        result.push(item);
      } else if (Array.isArray(item.list)) {
        walk(item.list as IImgList);
      }
    }
  };

  walk(imgList);
  return result;
}
