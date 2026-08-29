const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = __dirname;
const origin = 'https://koupa-website.pages.dev';
const pages = [
  { file: 'index.html', route: '/', lang: 'ar', dir: 'rtl', alternate: '/en/' },
  { file: 'privacy/index.html', route: '/privacy/', lang: 'ar', dir: 'rtl', alternate: '/en/privacy/' },
  { file: 'terms/index.html', route: '/terms/', lang: 'ar', dir: 'rtl', alternate: '/en/terms/' },
  { file: 'account-deletion/index.html', route: '/account-deletion/', lang: 'ar', dir: 'rtl', alternate: '/en/account-deletion/' },
  { file: 'en/index.html', route: '/en/', lang: 'en', dir: 'ltr', alternate: '/' },
  { file: 'en/privacy/index.html', route: '/en/privacy/', lang: 'en', dir: 'ltr', alternate: '/privacy/' },
  { file: 'en/terms/index.html', route: '/en/terms/', lang: 'en', dir: 'ltr', alternate: '/terms/' },
  { file: 'en/account-deletion/index.html', route: '/en/account-deletion/', lang: 'en', dir: 'ltr', alternate: '/account-deletion/' },
];

const landingScreens = [
  'assets/screens/role-selection.jpg',
  'assets/screens/customer-home.jpg',
  'assets/screens/customer-appointments.jpg',
  'assets/screens/customer-find.jpg',
  'assets/screens/barber-today.jpg',
  'assets/screens/barber-shop.jpg',
  'assets/screens/barber-schedule.jpg',
];

function load(file) {
  const absolute = path.join(root, file);
  assert.ok(fs.existsSync(absolute), `Missing ${file}`);
  const source = fs.readFileSync(absolute, 'utf8');
  return { source, document: new JSDOM(source).window.document };
}

for (const page of pages) {
  const { source, document } = load(page.file);
  const html = document.documentElement;
  const h1 = document.querySelectorAll('h1');
  const canonical = document.querySelector('link[rel="canonical"]');
  const alternate = document.querySelector(`link[rel="alternate"][hreflang="${page.lang === 'ar' ? 'en' : 'ar'}"]`);
  const description = document.querySelector('meta[name="description"]');
  const links = [...document.querySelectorAll('a[href]')].map((link) => link.getAttribute('href'));
  const expectedLinks = page.lang === 'ar'
    ? ['/privacy/', '/terms/', '/account-deletion/']
    : ['/en/privacy/', '/en/terms/', '/en/account-deletion/'];

  assert.equal(html.lang, page.lang, `${page.file} language`);
  assert.equal(html.dir, page.dir, `${page.file} direction`);
  assert.equal(h1.length, 1, `${page.file} must have one h1`);
  assert.ok(document.title.trim(), `${page.file} title`);
  assert.ok(description?.getAttribute('content')?.trim(), `${page.file} description`);
  assert.equal(canonical?.getAttribute('href'), `${origin}${page.route}`, `${page.file} canonical`);
  assert.equal(alternate?.getAttribute('href'), `${origin}${page.alternate}`, `${page.file} alternate`);
  assert.ok(links.includes(page.alternate), `${page.file} visible language link`);
  for (const href of expectedLinks) assert.ok(links.includes(href), `${page.file} missing ${href}`);
  assert.doesNotMatch(source, /كوبا|example\.com|TODO|TBD/);

  if (page.file === 'index.html' || page.file === 'en/index.html') {
    const figures = document.querySelectorAll('.landing-shot');
    assert.equal(figures.length, 7, `${page.file} product gallery count`);
    assert.equal(document.querySelectorAll('.landing-phone img').length, 8, `${page.file} phone image count`);
    for (const image of document.querySelectorAll('.landing-shot img')) {
      const src = image.getAttribute('src') ?? '';
      assert.ok(src.startsWith('/assets/screens/'), `${page.file} screenshot path`);
      assert.ok(image.getAttribute('alt')?.trim(), `${page.file} screenshot alt text`);
    }
  }
}

const notFound = load('404.html');
assert.equal(notFound.document.querySelectorAll('h1').length, 1, '404 must have one h1');
assert.ok(notFound.document.title.trim(), '404 title');
assert.ok(notFound.document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim(), '404 description');
assert.match(notFound.document.body.textContent, /الصفحة غير موجودة/);
assert.match(notFound.document.body.textContent, /Page not found/);

const arabicDeletion = load('account-deletion/index.html').document;
const englishDeletion = load('en/account-deletion/index.html').document;
assert.match(arabicDeletion.body.textContent, /حذف الحساب من داخل التطبيق/);
assert.match(englishDeletion.body.textContent, /Delete your account in the app/);
assert.match(arabicDeletion.body.textContent, /saadisamir20200@gmail\.com/);
assert.match(englishDeletion.body.textContent, /saadisamir20200@gmail\.com/);
assert.match(englishDeletion.body.textContent, /anonym/i);
assert.ok(arabicDeletion.querySelector('a[href="mailto:saadisamir20200@gmail.com"]'));
assert.ok(englishDeletion.querySelector('a[href="mailto:saadisamir20200@gmail.com"]'));

for (const asset of [
  'assets/styles.css',
  'assets/logo-mark.png',
  'assets/logo-full.png',
  'assets/app-icon.png',
  'assets/IBMPlexSansArabic-Regular.ttf',
  'assets/IBMPlexSansArabic-SemiBold.ttf',
  '_headers',
  ...landingScreens,
]) {
  assert.ok(fs.existsSync(path.join(root, asset)), `Missing ${asset}`);
}

console.log(`Koupa legal site checks passed (${pages.length + 1} pages).`);
