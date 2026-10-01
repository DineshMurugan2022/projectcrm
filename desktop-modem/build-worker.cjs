const fs = require('node:fs');
const path = require('node:path');
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Build on Windows x64 with the tested Node runtime.');
const source = path.resolve(__dirname, '../huawei-e173-test');
const bundle = path.join(__dirname, 'bundle');
fs.mkdirSync(bundle, { recursive: true });
for (const name of ['serialport', 'naudiodon', 'speaker', 'socket.io-client']) require(path.join(source, 'node_modules', name));
fs.cpSync(path.join(source, 'lib'), path.join(bundle, 'lib'), { recursive: true });
fs.cpSync(path.join(source, 'node_modules'), path.join(bundle, 'node_modules'), { recursive: true,
  filter: file => !/\.(pdb|iobj|ipdb|exp|lib)$/.test(file) && !file.includes(`${path.sep}obj${path.sep}`) });
fs.copyFileSync(process.execPath, path.join(bundle, 'node.exe'));
fs.copyFileSync(path.join(__dirname, 'worker.cjs'), path.join(bundle, 'worker.cjs'));
fs.writeFileSync(path.join(bundle, 'runtime.json'), JSON.stringify({ node: process.version, arch: process.arch }));
console.log('Bundled the tested Node runtime, modem code, and native audio dependencies.');
