/* eslint-disable */
// from: https://github.com/onikienko/7zip-min/blob/master/index.js

const { spawn } = require('child_process');
// IMPORTANT: 更改了这一行
const path7za = require('7zip-bin').path7za.replace(
  'app.asar',
  'app.asar.unpacked/node_modules/7zip-bin'
);

/**
 * Unpack archive.
 * @param {string} pathToPack - path to archive you want to unpack.
 * @param {string|function} destPathOrCb - Either:
 *                                              (i) destination path, where to unpack.
 *                                              (ii) callback function, in case no destPath to be specified
 * @param {function} [cb] - callback function. Will be called once unpack is done. If no errors, first parameter will contain `null`
 * NOTE: Providing destination path is optional. In case it is not provided, cb is expected as the second argument to function.
 */
function unpack(pathToPack, destPathOrCb, cb) {
  if (typeof destPathOrCb === 'function' && cb === undefined) {
    cb = destPathOrCb;
    run(path7za, ['x', pathToPack, '-y'], cb);
  } else {
    run(path7za, ['x', pathToPack, '-y', `-o${destPathOrCb}`], cb);
  }
}

/**
 * Pack file or folder to archive.
 * @param {string} pathToSrc - path to file or folder you want to compress.
 * @param {string} pathToDest - path to archive you want to create.
 * @param {function} cb - callback function. Will be called once pack is done. If no errors, first parameter will contain `null`.
 */
function pack(pathToSrc, pathToDest, cb) {
  run(path7za, ['a', pathToDest, pathToSrc], cb);
}

/**
 * Get an array with compressed file contents.
 * @param {string} pathToSrc - path to file its content you want to list.
 * @param {function} cb - callback function. Will be called once list is done. If no errors, first parameter will contain `null`.
 */
function list(pathToSrc, cb) {
  run(path7za, ['l', '-slt', '-ba', pathToSrc], cb);
}

/**
 * Run 7za with parameters specified in `paramsArr`.
 * @param {array} paramsArr - array of parameter. Each array item is one parameter.
 * @param {function} cb - callback function. Will be called once command is done. If no errors, first parameter will contain `null`. If no output, second parameter will be `null`.
 */
function cmd(paramsArr, cb) {
  run(path7za, paramsArr, cb);
}

function run(bin, args, cb) {
  cb = onceify(cb);
  const runError = new Error(); // get full stack trace
  const proc = spawn(bin, args, { windowsHide: true });
  let output = '';
  proc.on('error', function (err) {
    cb(err);
  });
  proc.on('exit', function (code) {
    let result = null;
    if (args[0] === 'l') {
      result = parseListOutput(output);
    }
    if (code) {
      runError.message = `7-zip exited with code ${code}\n${output}`;
    }
    cb(code ? runError : null, result);
  });
  proc.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  proc.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });
}

// http://stackoverflow.com/questions/30234908/javascript-v8-optimisation-and-leaking-arguments
// javascript V8 optimisation and “leaking arguments”
// making callback to be invoked only once
function onceify(fn) {
  let called = false;
  return function () {
    if (called) return;
    called = true;
    fn.apply(this, Array.prototype.slice.call(arguments)); // slice arguments
  };
}

function parseListOutput(str) {
  if (!str.length) return [];
  str = str.replace(/(\r\n|\n|\r)/gm, '\n');
  const items = str.split(/^\s*$/m);
  const res = [];
  const LIST_MAP = {
    Path: 'name',
    Size: 'size',
    'Packed Size': 'compressed',
    Attributes: 'attr',
    Modified: 'dateTime',
    CRC: 'crc',
    Method: 'method',
    Block: 'block',
    Encrypted: 'encrypted',
  };

  if (!items.length) return [];

  for (const item of items) {
    if (!item.length) continue;
    const obj = {};
    const lines = item.split('\n');
    if (!lines.length) continue;
    for (const line of lines) {
      const data = line.split(' = ');
      if (data.length !== 2) continue;
      const name = data[0].trim();
      const val = data[1].trim();
      if (LIST_MAP[name]) {
        if (LIST_MAP[name] === 'dateTime') {
          const dtArr = val.split(' ');
          if (dtArr.length !== 2) continue;
          obj.date = dtArr[0];
          obj.time = dtArr[1];
        } else {
          obj[LIST_MAP[name]] = val;
        }
      }
    }
    if (Object.keys(obj).length) res.push(obj);
  }
  return res;
}

exports.unpack = unpack;
exports.pack = pack;
exports.list = list;
exports.cmd = cmd;
