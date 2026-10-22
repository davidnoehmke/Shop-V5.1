import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
function files(path) { return readdirSync(path, {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(join(path,e.name)) : [join(path,e.name)]); }
for (const path of files('dist/client')) {
  assert.ok(!/\.(?:map|tsx?)$/.test(path), `Public source artifact: ${path}`);
  if (/\.(?:js|css|html)$/.test(path)) {
    const text=readFileSync(path,'utf8');
    assert.ok(!text.includes('sourceMappingURL='), `Public sourcemap reference: ${path}`);
    assert.ok(!/shpat_[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,}/.test(text), `Credential in client: ${path}`);
  }
}
process.stdout.write('Public build contains no TypeScript sources, sourcemaps or recognized private credentials.\n');
