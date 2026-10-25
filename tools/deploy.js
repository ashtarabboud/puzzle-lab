/* Publish dist/ to the gh-pages branch of the "origin" remote (GitHub Pages serves it).
   Runs tests and a fresh build first so a broken build is never published. */
const { execSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const root = path.join(__dirname, '..');
const run = (c, o) => execSync(c, Object.assign({ cwd: root, stdio: 'inherit' }, o || {}));
if (!process.argv.includes('--skip-tests')) run('node test/run-all.js');
run('node tools/build.js');
const remote = execSync('git remote get-url origin', { cwd: root, encoding: 'utf8' }).trim();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghpages-'));
fs.cpSync(path.join(root, 'dist'), tmp, { recursive: true });
const g = c => execSync(c, { cwd: tmp, stdio: 'inherit' });
g('git init -q -b gh-pages');
g('git add -A');
g('git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "Deploy ' + new Date().toISOString() + '"');
g('git push -f ' + JSON.stringify(remote) + ' gh-pages');
console.log('Deployed to gh-pages');
