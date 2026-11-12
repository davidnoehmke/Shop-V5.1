import {readFileSync, appendFileSync, writeFileSync} from 'node:fs';
const deployment = JSON.parse(readFileSync('h2_deploy_log.json', 'utf8'));
const url = new URL(deployment.url);
if (url.protocol !== 'https:' || !url.hostname.endsWith('.oxygen.shop')) {
  throw new Error('Deployment did not return a verified Oxygen preview URL.');
}
if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `PILOT_BASE_URL=${url.origin}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nOxygen pilot preview: ${url.origin}/marken/venso\n`);
writeFileSync('preview.json', JSON.stringify({url: url.origin, commit: process.env.GITHUB_SHA}, null, 2));
