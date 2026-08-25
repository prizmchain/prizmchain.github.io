import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const catalog = JSON.parse(await readFile(resolve(root, 'assets/apps.json'), 'utf8'));
const requiredHooks = ['app-grid', 'featured-card', 'app-search', 'genre-filters'];

for (const hook of requiredHooks) {
  if (!html.includes(`id="${hook}"`)) throw new Error(`Missing DOM hook: ${hook}`);
}

if (catalog.apps.length < 20) throw new Error(`Suspiciously small app catalog: ${catalog.apps.length}`);
if (!catalog.apps.some((app) => app.id === 6758237365)) throw new Error('LookUp is missing from the catalog.');
if (new Set(catalog.apps.map((app) => app.id)).size !== catalog.apps.length) throw new Error('Duplicate app IDs in catalog.');

for (const app of catalog.apps) {
  await access(resolve(root, app.icon));
  if (!app.url.startsWith('https://apps.apple.com/')) throw new Error(`Invalid App Store URL for ${app.name}`);
}

console.log(`Site check passed: ${catalog.apps.length} apps, ${requiredHooks.length} DOM hooks.`);
