// Runs every test/t_*.js file; each prints "bad N" as its last line.
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
let failed = 0;
for (const f of fs.readdirSync(__dirname).filter(f => /^t_.*\.js$/.test(f)).sort()) {
  const t0 = Date.now();
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(__dirname, f)], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 900000, maxBuffer: 1 << 26 }); }
  catch (e) { out = (e.stdout || '') + '\n' + (e.stderr || '') + '\nbad CRASH'; }
  const last = out.trim().split('\n').pop();
  const ok = last === 'bad 0';
  if (!ok) { failed++; console.log(out.split('\n').filter(l => /FAIL|bad|Error|CRASH|mismatch|not unique/i.test(l)).slice(0, 20).join('\n')); }
  console.log((ok ? 'PASS ' : 'FAIL ') + f + ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
}
console.log(failed ? failed + ' test file(s) failed' : 'All tests passed');
process.exit(failed ? 1 : 0);
