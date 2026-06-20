import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const css = fs.readFileSync(path.join(root, 'src/styles/global.css'), 'utf8');
const baseLayout = fs.readFileSync(path.join(root, 'src/layouts/BaseLayout.astro'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const blogDir = path.join(root, 'src/content/blog');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readMarkdownPosts(dir) {
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const fullPath = path.join(dir, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
      assert(match, `${file} must start with YAML frontmatter`);
      return { file, fullPath, raw, frontmatter: match[1], body: raw.slice(match[0].length) };
    });
}

function frontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

assert(packageJson.scripts?.build, 'package.json must keep a build script');
assert(packageJson.scripts?.test === 'node tests/site-contract.mjs', 'npm test must run the site contract');

const revealBlock = css.match(/\.reveal\s*\{[^}]*\}/s)?.[0] ?? '';
assert(revealBlock, 'global.css must define .reveal');
assert(!/opacity\s*:\s*0\b/.test(revealBlock), 'Primary content must not be hidden by default with .reveal opacity: 0');
assert(!/translateY\(/.test(revealBlock), 'Primary content must not be moved off-position by default with .reveal translateY');
assert(/\.reveal\.js-reveal/.test(css), 'Motion reveal styling must be opt-in via .reveal.js-reveal');
assert(/IntersectionObserver/.test(baseLayout), 'Smooth reveal fade-in must use IntersectionObserver');
assert(/classList\.add\('js-reveal'\)/.test(baseLayout), 'Reveal script must add js-reveal only after JavaScript loads');
assert(/classList\.add\('in'\)/.test(baseLayout), 'Reveal script must add in class when sections enter viewport');
assert(/from '@vercel\/analytics'/.test(baseLayout) && /inject\(\)/.test(baseLayout), 'Portfolio must load Vercel Web Analytics so visits are visible in Vercel');
assert(/srv1522777\.tail72f980\.ts\.net:8448\/visit/.test(baseLayout), 'Portfolio must send privacy-safe custom visitor beacons to Imperator collector');
assert(/marco_site_owner/.test(baseLayout) && /params\.get\('owner'\) === 'marco'/.test(baseLayout), 'Owner marking must be available through ?owner=marco');

const posts = readMarkdownPosts(blogDir);
const published = posts.filter((post) => frontmatterValue(post.frontmatter, 'draft') !== 'true');
assert(published.length > 0, 'At least one published blog post must exist');

const requiredFrontmatter = ['title', 'description', 'category', 'pubDate'];
const forbiddenPublicPatterns = [
  { re: /TODO|FIXME|TK_PLACEHOLDER/i, label: 'placeholder marker' },
  { re: /\/home\/marco|\.hermes|\.env|Vaultwarden/i, label: 'private local path or secret storage reference' },
  { re: /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}\b|\b192\.168\.\d{1,3}\.\d{1,3}\b|\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, label: 'private or Tailscale IP address' },
  { re: /cron job|job id|ssh pi5|pihole_project_metrics_sync|imperator/i, label: 'internal automation detail' },
];

for (const post of published) {
  for (const key of requiredFrontmatter) {
    assert(frontmatterValue(post.frontmatter, key), `${post.file} missing ${key}`);
  }
  assert(post.body.trim().length > 200, `${post.file} body is too thin for a public article`);
  for (const { re, label } of forbiddenPublicPatterns) {
    assert(!re.test(post.raw), `${post.file} contains forbidden public content: ${label}`);
  }
}

console.log('site contract passed');
