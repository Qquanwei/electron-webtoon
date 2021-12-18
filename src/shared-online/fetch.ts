import config from '../server/config.json';

const myfetch = (url) => {
  return fetch(`http://localhost:${config.localserverport}${url}`, {
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

myfetch.post = (url, data) => {
  return fetch(`http://localhost:${config.localserverport}${url}`, {
    method: 'POST',
    body: JSON.stringify(data),
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

myfetch.delete = (url) => {
  return fetch(`http://localhost:${config.localserverport}${url}`, {
    method: 'DELETE',
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

myfetch.put = (url, data) => {
  return fetch(`http://localhost:${config.localserverport}${url}`, {
    method: 'PUT',
    body: JSON.stringify(data),
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

export default myfetch;
