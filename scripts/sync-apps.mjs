import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dataPath = resolve(root, 'assets/apps.json');
const jsPath = resolve(root, 'assets/apps-data.js');
const iconsDir = resolve(root, 'assets/icons');
const artistId = 1839727056;
const endpoint = `https://itunes.apple.com/lookup?id=${artistId}&entity=software&country=us&limit=200`;

const response = await fetch(endpoint, { headers: { 'user-agent': 'PRIZM-Catalog-Sync/1.0' } });
if (!response.ok) throw new Error(`Apple catalog request failed: ${response.status}`);
const payload = await response.json();

const apps = payload.results
  .filter((item) => item.wrapperType === 'software')
  .map((item) => ({
    id: item.trackId,
    slug: new URL(item.trackViewUrl).pathname.split('/').filter(Boolean).at(-2) || String(item.trackId),
    name: item.trackName,
    genre: item.primaryGenreName,
    version: item.version,
    description: item.description,
    releaseDate: item.currentVersionReleaseDate,
    url: item.trackViewUrl.replace(/[?&]uo=4(?:&|$)/, ''),
    icon: `assets/icons/${item.trackId}.jpg`,
    iconSource: item.artworkUrl512
  }))
  .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

if (!apps.length) throw new Error('Apple catalog returned no software results.');
if (new Set(apps.map((app) => app.id)).size !== apps.length) throw new Error('Apple catalog contains duplicate app IDs.');

await mkdir(iconsDir, { recursive: true });

for (const app of apps) {
  const iconPath = resolve(root, app.icon);
  try {
    await access(iconPath);
  } catch {
    const iconResponse = await fetch(app.iconSource);
    if (!iconResponse.ok) throw new Error(`Icon download failed for ${app.name}: ${iconResponse.status}`);
    await mkdir(dirname(iconPath), { recursive: true });
    await writeFile(iconPath, Buffer.from(await iconResponse.arrayBuffer()));
  }
}

let previous = null;
try {
  previous = JSON.parse(await readFile(dataPath, 'utf8'));
} catch {}

const unchanged = previous && JSON.stringify(previous.apps) === JSON.stringify(apps);
if (unchanged) {
  console.log(`Catalog unchanged: ${apps.length} apps.`);
  process.exit(0);
}

const catalog = {
  artistId,
  generatedAt: new Date().toISOString(),
  source: endpoint,
  apps
};

await writeFile(dataPath, `${JSON.stringify(catalog, null, 2)}\n`);
await writeFile(jsPath, `window.PRIZM_APP_CATALOG = ${JSON.stringify(catalog, null, 2)};\n`);
console.log(`Catalog updated: ${apps.length} apps.`);
