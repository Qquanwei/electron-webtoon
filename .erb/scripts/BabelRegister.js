const path = require('path');
console.log('preload execute', path.join(__dirname, '../..'))
const register = require('@babel/register')
register({
  extensions: ['.es6', '.es', '.jsx', '.js', '.mjs', '.ts', '.tsx'],
  cwd: path.join(__dirname, '../..'),
  root: path.join(__dirname, "../../")
});
