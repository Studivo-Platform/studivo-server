const { env } = require('../config/env');

// Build Amazon search URL
const buildAmazonSearchUrl = (keywords, partnerTag) => {
  const encoded = encodeURIComponent(keywords);
  return `https://${env.AMAZON_HOST}/s?k=${encoded}&linkCode=ll2&tag=${env.AMAZON_PARTNER_TAG}&linkId=fe244ff313175e6c8cb92b630d419317&ref_=as_li_ss_tl`;
};

// Search Amazon for products matching parsed request data
const searchAmazon = async (parsedData) => {
  try {
    const keywords = parsedData.keywords.slice(0, 3).join(' ');
    if (!keywords) return [];

    return [{
      source:       'amazon',
      title:        `Search "${keywords}" on Amazon Egypt`,
      price:        null,
      originalUrl:  buildAmazonSearchUrl(keywords),
      affiliateUrl: buildAmazonSearchUrl(keywords),
      imageUrl:     'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      metadata:     { type: 'search_link', keywords },
    }];
  } catch (error) {
    console.error('[Affiliate] Amazon failed:', error.message);
    return [];
  }
};

// Noon Affiliate
// Noon doesn't have a public PA-API like Amazon.
// We use their affiliate link format + search URL.
// When user clicks → goes to Noon search with our affiliate ID → earns commission on purchase.

const buildNoonSearchUrl = (keywords) => {
  const encoded = encodeURIComponent(keywords);
  return `${env.NOON_BASE_URL}/egypt-en/search?q=${encoded}&aff_id=${env.NOON_AFFILIATE_ID}`;
};

const searchNoon = async (parsedData) => {
  try {
    // Noon doesn't have a free product search API.
    // We construct a search result that links directly to Noon search page.
    // This still earns affiliate commission when user purchases from Noon.
    const keywords = parsedData.keywords.slice(0, 3).join(' ');
    if (!keywords) return [];

    const searchUrl = buildNoonSearchUrl(keywords);

    // Return a single "search result" card that links to Noon
    return [
      {
        source:       'noon',
        title:        `Search "${keywords}" on Noon`,
        price:        parsedData.budget?.max || null,
        originalUrl:  searchUrl,
        affiliateUrl: searchUrl,
        imageUrl:     'https://f.nooncdn.com/s/app/com/noon/design-system/logos/revamp-logo-en-smaller.svg',
        metadata:     { type: 'search_link', keywords },
      },
    ];

  } catch (error) {
    console.error('[Affiliate] Noon search failed:', error.message);
    return [];
  }
};

module.exports = { searchAmazon, searchNoon };