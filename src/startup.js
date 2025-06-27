const path = require('path');
const register = require('@babel/register')

console.log('current env is:', process.env.NODE_ENV)
register({
  extensions: ['.es6', '.es', '.jsx', '.js', '.mjs', '.ts', '.tsx'],
  cwd: path.resolve(__dirname, "../")
});
require('./main.dev.ts');
