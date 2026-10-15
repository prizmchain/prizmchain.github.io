import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const metadata = JSON.parse(await readFile(new URL('1.0.json', import.meta.url), 'utf8'));
const expected = ['en-US', 'ko', 'ja', 'zh-Hans', 'zh-Hant', 'de-DE', 'fr-FR', 'es-ES', 'pt-BR', 'it'];
assert.deepEqual(Object.keys(metadata.localizations).sort(), expected.sort());
assert.equal(metadata.appName, 'Yours in Time');
assert.equal(metadata.bundleId, 'com.prizm.yoursintime');
const terms = 'https://prizmchain.github.io/yoursintime-terms-of-service.html';
const privacy = 'https://prizmchain.github.io/yoursintime-privacy-policy.html';
assert.equal(metadata.policyUrls.termsOfUse, terms);
assert.equal(metadata.policyUrls.privacyPolicy, privacy);
const footer = `Terms of Use: ${terms}\nPrivacy Policy: ${privacy}`;
const summary = [];
for (const [locale, copy] of Object.entries(metadata.localizations)) {
  const promo = [...copy.promotionalText].length;
  const keywords = [...copy.keywords].length;
  const keywordBytes = Buffer.byteLength(copy.keywords, 'utf8');
  const description = [...copy.description].length;
  assert(promo > 0 && promo <= 170, `${locale}: promotional text`);
  assert(keywords > 0 && keywords <= 100 && keywordBytes <= 100, `${locale}: keywords`);
  assert(description <= 4000 && Buffer.byteLength(copy.description) <= 4000, `${locale}: description`);
  assert(copy.description.endsWith(footer), `${locale}: exact policy footer`);
  assert.equal(copy.description.split(terms).length - 1, 1);
  assert.equal(copy.description.split(privacy).length - 1, 1);
  const tokens = copy.keywords.split(',');
  assert(tokens.every(token => token && token === token.trim()), `${locale}: keyword formatting`);
  assert.equal(new Set(tokens.map(token => token.toLocaleLowerCase())).size, tokens.length);
  assert(!/dayslip|revenuecat|receipt|10 languages|10개 언어/i.test(JSON.stringify(copy)), `${locale}: unrelated claims`);
  summary.push({ locale, promotionalCharacters: promo, keywordCharacters: keywords, keywordUtf8Bytes: keywordBytes, descriptionCharacters: description, identicalFooter: true });
}
for (const slug of ['terms-of-service', 'privacy-policy']) {
  const html = await readFile(new URL(`yoursintime-${slug}.html`, root), 'utf8');
  assert(html.includes('<html lang="en">'));
  assert(html.includes('Yours in Time'));
  assert(html.includes('October 16, 2026'));
  assert(!/DaySlip|AsyncStorage|\$2\.99/.test(html));
  assert(!/<script|fonts\.googleapis/i.test(html));
  const counterpart = slug === 'terms-of-service' ? 'privacy-policy' : 'terms-of-service';
  assert(html.includes(`href="yoursintime-${counterpart}.html"`));
  await access(new URL(`yoursintime-${counterpart}.html`, root));
}
console.log(JSON.stringify({ passed: true, locales: summary.length, fields: summary.length * 3, summary }, null, 2));
