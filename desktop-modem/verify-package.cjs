const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
module.exports = async context => {
  const worker = path.join(context.appOutDir, 'resources', 'worker');
  execFileSync(path.join(worker, 'node.exe'), ['-e', "require('./lib/modem'); require('./lib/agent'); require('naudiodon'); require('speaker'); console.log('Packaged modem dependencies verified');"], { cwd: worker, windowsHide: true, stdio: 'inherit' });
  const pbx = path.join(context.appOutDir, 'resources', 'pbx');
  for (const file of ['bny-pbx-engine.exe', 'MSVCP140.dll', 'VCRUNTIME140.dll', 'VCRUNTIME140_1.dll', 'PJSIP-LICENSE.txt', 'PJSIP-2.17-source.zip']) {
    const target = path.join(pbx, file);
    if (!fs.existsSync(target) || fs.statSync(target).size < 100) throw new Error(`Packaged PBX resource is missing or empty: ${file}`);
  }
  const pbxSource = path.join(context.appOutDir, 'resources', 'pbx-source');
  for (const file of ['pbx-engine.cpp', 'CMakeLists.txt', 'local-smoke.cjs', 'LICENSE.txt', 'build-pbx.ps1']) {
    if (!fs.existsSync(path.join(pbxSource, file))) throw new Error(`Packaged PBX source is missing: ${file}`);
  }
  console.log('Packaged PBX engine and PJSIP source/license verified');
};
