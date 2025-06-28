import config from "../server/config.json";

const host = "http://192.168.3.43";
const myfetch = (url: string) => {
  return fetch(`${host}:${config.localserverport}${url}`, {
    headers: {
      "Content-Type": "application/json",
    },
  }).then((resp) => {
    if (resp.status !== 200) {
      // eslint-disable-next-line
      throw resp;
    }
    return resp.json();
  });
};

myfetch.post = (url: string, data: Record<string, string>) => {
  return fetch(`${host}:${config.localserverport}${url}`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((resp) => {
    if (resp.status !== 200) {
      // eslint-disable-next-line
      throw resp;
    }
    return resp.json();
  });
};

myfetch.delete = (url: string) => {
  return fetch(`${host}:${config.localserverport}${url}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((resp) => {
    if (resp.status !== 200) {
      // eslint-disable-next-line
      throw resp;
    }
    return resp.json();
  });
};

myfetch.put = (url: string, data: Record<string, string>) => {
  return fetch(`${host}:${config.localserverport}${url}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((resp) => {
    if (resp.status !== 200) {
      // eslint-disable-next-line
      throw resp;
    }
    return resp.json();
  });
};

export default myfetch;
