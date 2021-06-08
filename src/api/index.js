import config from '../config.json';

function fetch(url, data) {
  return window
    .fetch(`http://localhost:${config.localserverport}${url}`, {
      ...data,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then((resp) => {
      return resp.json();
    });
}

// 获取漫画列表
export function fetchComicList() {
  return fetch('/comic');
}

// 获取某个漫画的信息
export function fetchComic(id) {
  return fetch(`/comic/${id}`);
}

// 添加一个
export function addComicToLibrary(path) {
  return fetch('/comic', {
    method: 'POST',
    body: JSON.stringify({
      path,
    }),
  });
}

// 这是一个比较耗时的流程, 递归获取图片列表
export function fetchImgList(id) {
  return fetch(`/comic/${id}/imglist`);
}

export function removeComic(id) {
  return fetch(`/comic/${id}`, {
    method: 'DELETE',
  });
}
