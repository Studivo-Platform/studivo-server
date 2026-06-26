const { chromium } = require('playwright');

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_RESULTS = 5;

const launchBrowser = async () => chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const safeCloseBrowser = async (browser) => {
  if (!browser) return;
  try {
    await browser.close();
  } catch (closeError) {
    console.warn('[Scraper] Browser close failed:', closeError.message);
  }
};

const normalizePrice = (value) => {
  const cleaned = String(value || '').replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : null;
};

const toAbsoluteUrl = (href, base) => {
  if (!href) return '';
  try {
    return new URL(href, base).toString();
  } catch (error) {
    return href;
  }
};

const buildResult = (item, source, baseUrl) => ({
  source,
  title: item.title?.trim() || '',
  price: normalizePrice(item.price),
  originalUrl: toAbsoluteUrl(item.originalUrl, baseUrl),
  affiliateUrl: toAbsoluteUrl(item.originalUrl, baseUrl),
  imageUrl: item.imageUrl || null,
  metadata: {},
});

const scrapeSite = async (url, scraper, source, baseUrl = url) => {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: DEFAULT_TIMEOUT_MS,
    });

    if (!response || response.status() >= 400) {
      throw new Error(`Navigation failed with status ${response?.status() || 'unknown'}`);
    }

    const rawResults = await scraper(page);
    if (!Array.isArray(rawResults)) {
      return [];
    }

    return rawResults
      .filter((result) => result && result.title && result.originalUrl)
      .slice(0, DEFAULT_MAX_RESULTS)
      .map((result) => buildResult(result, source, baseUrl));
  } catch (error) {
    console.error(`[Scraper] ${source} failed:`, error.message);
    return [];
  } finally {
    await safeCloseBrowser(browser);
  }
};

const scrapeOLX = async (keywords, category) => {
  const query = encodeURIComponent(keywords);
  const url = `https://www.olx.com.eg/items/q-${query}`;

  return scrapeSite(
    url,
    async (page) => page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-aut-id="itemBox"]'));
      return items.map((item) => ({
        title: item.querySelector('[data-aut-id="itemTitle"]')?.textContent,
        price: item.querySelector('[data-aut-id="itemPrice"]')?.textContent,
        originalUrl: item.querySelector('a')?.href,
        imageUrl: item.querySelector('img')?.src,
      }));
    }),
    'olx',
  );
};

const scrapeAqar = async (keywords) => {
  const baseUrl = 'https://aqar.finderr.com';
  const url = `${baseUrl}/?q=${encodeURIComponent(keywords)}`;

  return scrapeSite(
    url,
    async (page) => page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.property-card, .listing-card, article'));
      return items.map((item) => ({
        title: item.querySelector('h2, h3, .title')?.textContent,
        price: item.querySelector('.price, [class*="price"]')?.textContent,
        originalUrl: item.querySelector('a')?.href,
        imageUrl: item.querySelector('img')?.src,
      }));
    }),
    'aqar',
    baseUrl,
  );
};

const scrapeBtech = async (keywords) => {
  const baseUrl = 'https://www.btech.com.eg';
  const url = `${baseUrl}/catalogsearch/result/?q=${encodeURIComponent(keywords)}`;

  return scrapeSite(
    url,
    async (page) => page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.product-item, .item.product'));
      return items.map((item) => ({
        title: item.querySelector('.product-item-name, .product-name')?.textContent,
        price: item.querySelector('.price')?.textContent,
        originalUrl: item.querySelector('a')?.href,
        imageUrl: item.querySelector('img')?.src,
      }));
    }),
    'btech',
    baseUrl,
  );
};

module.exports = { scrapeOLX, scrapeAqar, scrapeBtech };