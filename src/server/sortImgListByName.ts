import path from 'path';
import nzh from 'nzh';

function tonum(name: string) {
  const dName = decodeURIComponent(name);
  const num = Number(dName.replace(/[^\d]/g, ''));

  // 处理 第1章, 第2章 这种情况
  // 这种情况忽略其他数字，只取中间的数字作为排序依据
  const result = dName.match(/第\d+章/);
  if (result && result.length) {
    return Number(result[0].slice(1, -1));
  }

  if (Number.isInteger(num)) {
    return num;
  }

  return Infinity;
}

// 将中文转成数字，适合中文目录的情况
function converNameToNumber(name) {
  const dName = decodeURIComponent(name);

  if (/最终/.test(dName)) {
    return Infinity;
  }
  // 如果是类似 第一章 这种名字，则使用中文简体来转换。目前仅支持中文简体转换
  return nzh.cn.decodeS(dName);
}

/*
  对漫画文件进行排序, 首先对所有文件名进行排序
 */
export default function sortImgListByName(
  imglist: IComicImgList
): IComicImgList {
  return imglist.sort((a, b) => {
    if (typeof a === 'string' && typeof b === 'string') {
      return tonum(path.basename(a)) - tonum(path.basename(b));
    }

    a.list = sortImgListByName(a.list);
    b.list = sortImgListByName(b.list);

    return (
      (converNameToNumber(a.name) || tonum(a.name)) -
      (converNameToNumber(b.name) || tonum(b.name))
    );
  });
}
