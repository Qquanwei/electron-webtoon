export default (url, data) => {
  // IMPORTANT 这里需要注入对应的配置信息
  const ip = window.LOCALSERVER_IP;
  const port = window.LOCALSERVER_PORT;

  return fetch(`http://${ip}:${port}{url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((resp) => {
    if (resp.status !== 200) {
      // eslint-disable-next-line
      throw resp;
    }
    return resp.json();
  });
};
