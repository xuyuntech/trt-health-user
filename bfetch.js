import fetch from 'isomorphic-fetch';

const ErrNotFound = { status: 404, err: 'not found' };
const ErrNoContent = { status: 204, err: 'no content' };
const ErrUnauthorized = { status: 401, err: 'Unauthorized' };
const ErrInternalServerError = msg => ({ status: 500, err: msg });

async function bfetch(url, {
  req, method = 'GET', headers = {}, body = {}, params = {},
} = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Token': req ? req.header('X-Access-Token') : '',
      ...headers,
    },
    // body: JSON.stringify(body),
  };
  let uri = url;
  if (method === 'GET') {
    const paramStr = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
    if (paramStr) {
      uri += (url.indexOf('?') >= 0 ? '&' : '?') + paramStr;
    }
  } else {
    options.body = JSON.stringify(body);
  }
  console.log('----------->>>');
  console.log(`request [${method}]-> ${uri} \n\tparams: ${JSON.stringify(params)} \n\tbody: ${JSON.stringify(body)} \n\theaders: ${JSON.stringify(options.headers)}`);
  try {
    const res = await fetch(uri, options);
    if (res.status === 204) {
      if (method === 'DELETE') {
        return {};
      }
      throw ErrNoContent;
    }
    console.log(`response -> [${res.status}]:${res.statusText}]`);
    const data = await res.json();
    console.log(`response body -> ${JSON.stringify(data)}`);
    console.log('<<<-----------');
    if (res.status === 404) {
      throw ErrNotFound;
    }
    if (res.status === 401) {
      throw ErrUnauthorized;
    }
    if (res.status === 500) {
      console.log('request 500:>', data);
      throw ErrInternalServerError(data);
    }
    if (res.status !== 200) {
      const err = {
        status: res.status,
        err: res.statusText,
      };
      throw err;
    }
    return data;
  } catch (err) {
    throw err;
  }
}

module.exports = bfetch;