const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'node_modules/electron-vite/dist/chunks/lib-DyJQBCfr.mjs');
if (fs.existsSync(target)) {
  let code = fs.readFileSync(target, 'utf-8');
  const old = `const ps = spawn(electronPath, [entry].concat(args), { stdio: 'inherit' });`;
  const patched = `const _env = {...process.env}; delete _env.ELECTRON_RUN_AS_NODE; const ps = spawn(electronPath, [entry].concat(args), { stdio: 'inherit', env: _env });`;
  if (code.includes(old)) {
    code = code.replace(old, patched);
    fs.writeFileSync(target, code);
    console.log('Patched electron-vite: removed ELECTRON_RUN_AS_NODE from spawn env');
  } else {
    console.log('electron-vite already patched or spawn line changed');
  }
}
