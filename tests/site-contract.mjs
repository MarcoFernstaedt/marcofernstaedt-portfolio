import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/styles/global.css'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(packageJson.scripts?.build, 'package.json must keep a build script');

const revealBlock = css.match(/\.reveal\s*\{[^}]*\}/s)?.[0] ?? '';
assert(revealBlock, 'global.css must define .reveal');
assert(!/opacity\s*:\s*0\b/.test(revealBlock), 'Primary content must not be hidden by default with .reveal opacity: 0');
assert(!/translateY\(/.test(revealBlock), 'Primary content must not be moved off-position by default with .reveal translateY');
assert(/\.reveal\.js-reveal/.test(css), 'Motion reveal styling must be opt-in via .reveal.js-reveal');

console.log('site contract passed');
