const { execFileSync } = require('node:child_process');
const path = require('node:path');
module.exports = async context => {
  const worker = path.join(context.appOutDir, 'resources', 'worker');
  execFileSync(path.join(worker, 'node.exe'), ['-e', "require('./lib/modem'); require('./lib/agent'); require('naudiodon'); require('speaker'); console.log('Packaged modem dependencies verified');"], { cwd: worker, windowsHide: true, stdio: 'inherit' });
};
