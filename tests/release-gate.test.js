const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const sourceScript = path.resolve(__dirname, '../scripts/build-public.js');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'f200-release-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.copyFileSync(sourceScript, path.join(root, 'scripts/build-public.js'));
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><html><head><title>Test</title></head><body><div class="demo-bar">Live-Demo · nicht veröffentlicht</div><h1>Test</h1></body></html>');
  return root;
}

function run(root, env) {
  return execFileSync(process.execPath, [path.join(root, 'scripts/build-public.js')], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

test('preview remains non-indexable even when release flags are set', () => {
  const root = fixture();
  const output = run(root, {
    VERCEL_ENV: 'preview',
    PUBLIC_RELEASE_ENABLED: 'true',
    PUBLIC_INDEXING_ENABLED: 'true',
    LEGAL_RELEASE_APPROVED: 'true',
    VERCEL_URL: 'preview.example.test',
  });
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  const llms = fs.readFileSync(path.join(root, 'llms.txt'), 'utf8');
  assert.match(output, /"canIndex":false/);
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.equal(robots, 'User-agent: *\nDisallow: /\n');
  assert.match(llms, /non-indexed staging\/release gate/);
});

test('production indexes only when every explicit release gate is true', () => {
  const root = fixture();
  const output = run(root, {
    VERCEL_ENV: 'production',
    PUBLIC_RELEASE_ENABLED: 'true',
    PUBLIC_INDEXING_ENABLED: 'true',
    LEGAL_RELEASE_APPROVED: 'true',
    VERCEL_PROJECT_PRODUCTION_URL: 'football200.example.test',
  });
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const llms = fs.readFileSync(path.join(root, 'llms.txt'), 'utf8');
  assert.match(output, /"canIndex":true/);
  assert.match(html, /index,follow,max-image-preview:large/);
  assert.match(html, /rel="canonical" href="https:\/\/football200\.example\.test\/"/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /Live-Demo · nicht veröffentlicht/);
  assert.match(robots, /Allow: \/\n/);
  assert.match(robots, /Disallow: \/admin\//);
  assert.match(robots, /Sitemap: https:\/\/football200\.example\.test\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/football200\.example\.test\/<\/loc>/);
  assert.match(llms, /public production release/);
});

test('production remains blocked if legal approval is absent', () => {
  const root = fixture();
  const output = run(root, {
    VERCEL_ENV: 'production',
    PUBLIC_RELEASE_ENABLED: 'true',
    PUBLIC_INDEXING_ENABLED: 'true',
    LEGAL_RELEASE_APPROVED: 'false',
  });
  assert.match(output, /"canIndex":false/);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /noindex,nofollow,noarchive/);
});
