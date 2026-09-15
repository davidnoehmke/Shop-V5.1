'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {validateProposal, number} = require('./controller.cjs');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function config(env = process.env) {
  assert(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(env.SHOPIFY_STORE || ''), 'SHOPIFY_STORE must be the canonical myshopify.com host, without https://');
  const staging = number(env.SHOPIFY_STAGING_THEME_ID), live = number(env.SHOPIFY_LIVE_THEME_ID);
  assert(staging !== live, 'Staging and live theme IDs must differ');
  assert(env.SHOPIFY_CLI_THEME_TOKEN, 'Shopify Theme Access token is missing');
  return {store: env.SHOPIFY_STORE, staging, live};
}
function cli(args) {
  const result = spawnSync('shopify', args, {encoding: 'utf8', timeout: 300000, maxBuffer: 12 * 1024 * 1024,
    env: {...process.env, CI: 'true', SHOPIFY_CLI_NO_ANALYTICS: '1'}});
  assert(!result.error && result.status === 0, `Shopify ${args.slice(0, 2).join(' ')} failed; no live write was attempted by this script`);
  return result.stdout;
}
function roles(data, cfg) {
  const themes = Array.isArray(data) ? data : data.themes;
  assert(Array.isArray(themes), 'Unexpected Shopify theme-list response');
  const staging = themes.find(t => String(t.id) === String(cfg.staging));
  const live = themes.find(t => String(t.id) === String(cfg.live));
  assert(String(staging?.role).toLowerCase() === 'unpublished', 'Configured staging theme is not unpublished');
  assert(String(live?.role).toLowerCase() === 'main', 'Configured live theme is no longer MAIN');
}
function output(key, value) { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`); }
async function staging() {
  const cfg = config();
  const candidate = path.resolve(process.env.CANDIDATE_PATH || 'candidate');
  assert(fs.existsSync(path.join(candidate, 'layout/theme.liquid')), 'Candidate is not a Shopify theme');
  roles(JSON.parse(cli(['theme', 'list', '--store', cfg.store, '--json'])), cfg);
  cli(['theme', 'check', '--path', candidate, '--fail-level', 'error']);
  // --allow-live and --publish are deliberately absent. Preserve unrelated staging assets.
  cli(['theme', 'push', '--store', cfg.store, '--theme', String(cfg.staging), '--path', candidate, '--nodelete', '--json']);
  roles(JSON.parse(cli(['theme', 'list', '--store', cfg.store, '--json'])), cfg);
  const url = new URL(`https://${cfg.store}/`); url.searchParams.set('preview_theme_id', String(cfg.staging));
  output('preview_url', url.href);
  console.log(`Uploaded to unpublished staging theme ${cfg.staging}. Browser checks and merge have not run yet.`);
}
function matchesFiles(directory, proposal, marker) {
  const markerPath = path.join(directory, 'assets/leaf-release.json');
  if (!fs.existsSync(markerPath)) return false;
  let remote;
  try { remote = JSON.parse(fs.readFileSync(markerPath, 'utf8')); } catch { return false; }
  if (Object.keys(marker).some(key => remote[key] !== marker[key])) return false;
  return proposal.files.every(file => {
    const target = path.join(directory, file.path);
    if (!fs.existsSync(target) || !fs.lstatSync(target).isFile()) return false;
    const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
    return digest(fs.readFileSync(target)) === digest(Buffer.from(file.content));
  });
}
async function verifyLive() {
  const cfg = config(); const proposal = validateProposal(process.env.CODEX_RESULT);
  const marker = JSON.parse(process.env.EXPECTED_MARKER || '{}');
  assert(marker.repository === 'davidnoehmke/Shop-V5.1' && marker.run === number(process.env.GITHUB_RUN_ID), 'Invalid expected release marker');
  roles(JSON.parse(cli(['theme', 'list', '--store', cfg.store, '--json'])), cfg);
  for (let attempt = 0; attempt < 12; attempt++) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'leaf-live-verify-'));
    try {
      const args = ['theme', 'pull', '--store', cfg.store, '--theme', String(cfg.live), '--path', directory];
      for (const filename of ['assets/leaf-release.json', ...proposal.files.map(f => f.path)]) args.push('--only', filename);
      cli(args);
      if (matchesFiles(directory, proposal, marker)) {
        output('live_url', `https://${cfg.store}/`);
        console.log('Native Shopify delivery verified: release marker and every proposed file match exactly.'); return;
      }
    } finally { fs.rmSync(directory, {recursive: true, force: true}); }
    await pause(10000);
  }
  throw new Error('Merge completed, but Shopify live file verification timed out. No automatic rollback or successful publication is claimed.');
}
module.exports = {config, roles, matchesFiles};
if (require.main === module) {
  const commands = {staging, 'verify-live': verifyLive};
  const command = commands[process.argv[2]]; assert(command, 'Unknown delivery command');
  command().catch(error => { console.error(error instanceof SyntaxError ? 'Invalid JSON configuration or Shopify response' : error.message); process.exitCode = 1; });
}
