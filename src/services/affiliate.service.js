const ProductAdvertisingAPIv1 = require('paapi5-nodejs-sdk');
const { env } = require('../config/env');

// Amazon PA-API v5 Setup
const amazonClient = ProductAdvertisingAPIv1.ApiClient.instance;
amazonClient.accessKey  = env.AMAZON_ACCESS_KEY;
amazonClient.secretKey  = env.AMAZON_SECRET_KEY;
amazonClient.host       = env.AMAZON_HOST;
amazonClient.region     = env.AMAZON_REGION;

const amazonApi = new ProductAdvertisingAPIv1.DefaultApi();

// Build affiliate URL with partner tag
// Every click through this URL earns commission if user purchases
const buildAmazonAffiliateUrl = (asin) => {
  return `https://${env.AMAZON_HOST}/dp/${asin}?tag=${env.AMAZON_PARTNER_TAG}`;
};

// Search Amazon for products matching parsed request data
const searchAmazon = async (parsedData) => {
  try {
    // Map our categories to Amazon search indexes
    const searchIndexMap = {
      electronics: 'Electronics',
      books:       'Books',
      housing:     'All',            // Amazon doesn't have housing
      services:    'All',
      other:       'All',
    };

    const searchIndex = searchIndexMap[parsedData.category] || 'All';

    // Build search keywords from parsed specs + original keywords
    const keywords = [
      ...parsedData.keywords.slice(0, 3),
      parsedData.subCategory,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!keywords) return [];

    const searchRequest = new ProductAdvertisingAPIv1.SearchItemsRequest();
    searchRequest.PartnerTag   = env.AMAZON_PARTNER_TAG;
    searchRequest.PartnerType  = 'Associates';
    searchRequest.Keywords     = keywords;
    searchRequest.SearchIndex  = searchIndex;
    searchRequest.ItemCount    = 5;  // Max 5 results per request
    searchRequest.Resources    = [
      'ItemInfo.Title',
      'Offers.Listings.Price',
      'Images.Primary.Medium',
    ];

    const response = await new Promise((resolve, reject) => {
      amazonApi.searchItems(searchRequest, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });

    if (!response?.SearchResult?.Items) return [];

    return response.SearchResult.Items.map((item) => ({
      source:       'amazon',
      title:        item.ItemInfo?.Title?.DisplayValue || 'Amazon Product',
      price:        item.Offers?.Listings?.[0]?.Price?.Amount || null,
      originalUrl:  item.DetailPageURL,
      affiliateUrl: buildAmazonAffiliateUrl(item.ASIN),
      imageUrl:     item.Images?.Primary?.Medium?.URL || null,
      metadata:     { asin: item.ASIN },
    }));

  } catch (error) {
    console.error('[Affiliate] Amazon search failed:', error.message);
    return [];  // Return empty — don't break the whole request
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
        imageUrl:     'https://f.nooncdn.com/s/app/com/noon/images/noon-logo.svg',
        metadata:     { type: 'search_link', keywords },
      },
    ];

  } catch (error) {
    console.error('[Affiliate] Noon search failed:', error.message);
    return [];
  }
};

module.exports = { searchAmazon, searchNoon };