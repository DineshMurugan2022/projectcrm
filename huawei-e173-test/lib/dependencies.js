// Use backend dependencies when the modem library is hosted by the CRM backend.
const { createRequire } = require('node:module');
const path = require('node:path');
module.exports = name => {
  try { return require(name); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return createRequire(path.resolve(__dirname, '../../backend/package.json'))(name);
  }
};
