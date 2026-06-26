const { ApiError }     = require('../utils/ApiError');
const { ApiResponse }  = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const { Request }      = require('../models/Request');
const { ScrapedResult } = require('../models/ScrapedResult');
const { searchAmazon, searchNoon } = require('../services/affiliate.service');
const { scrapeOLX, scrapeAqar, scrapeBtech } = require('../services/scraper.service');

const MIN_LOCAL_RESULTS = 3;   // Trigger external scrape if below this

// Local search using Atlas Search or text index fallback
const localSearch = async ({ q, category, maxPrice, minPrice, page, limit }) => {
  const skip = (page - 1) * limit;

  let query;

  try {
    // Try Atlas Search first (better relevance, supports Arabic)
    const pipeline = [
      {
        $search: {
          index: 'request_search',
          compound: {
            must: [
              {
                text: {
                  query: q,
                  path:  ['rawText', 'parsedData.keywords'],
                  fuzzy: { maxEdits: 1 },  // Tolerate 1 typo
                },
              },
            ],
            filter: [
              { equals: { path: 'status', value: 'open' } },
            ],
          },
        },
      },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from:         'users',
          localField:   'userId',
          foreignField: '_id',
          as:           'user',
          pipeline:     [{ $project: { name: 1, university: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmpty: true } },
    ];

    if (category) {
      pipeline[0].$search.compound.filter.push({
        equals: { path: 'parsedData.category', value: category },
      });
    }

    const results = await Request.aggregate(pipeline);
    return results.map((r) => ({ ...r, _source: 'local' }));

  } catch {
    // Atlas Search not available → fall back to MongoDB $text index
    console.warn('[Search] Atlas Search unavailable, using text index fallback');

    const filter = { $text: { $search: q }, status: 'open' };
    if (category)  filter['parsedData.category'] = category;
    if (maxPrice)  filter['parsedData.budget.max'] = { $lte: maxPrice };
    if (minPrice)  filter['parsedData.budget.min'] = { $gte: minPrice };

    const results = await Request
      .find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name university')
      .lean();

    return results.map((r) => ({ ...r, _source: 'local' }));
  }
};

// GET /api/search
const search = asyncHandler(async (req, res) => {
  const { q, category, maxPrice, minPrice, page, limit } = req.query;

  // 1. Search local DB
  const localResults = await localSearch({ q, category, maxPrice, minPrice, page, limit });

  let externalResults = [];
  let triggeredScraper = false;

  // 2. If not enough local results → trigger on-demand external search
  if (localResults.length < MIN_LOCAL_RESULTS) {
    triggeredScraper = true;

    // Build parsedData-like object from search query for affiliate service
    const searchContext = {
      category: category || 'other',
      keywords: q.split(' ').filter((w) => w.length > 2),
      budget:   { max: maxPrice || null, min: minPrice || null, currency: 'EGP' },
    };

    // Run Amazon + Noon in parallel
    const [amazonRes, noonRes] = await Promise.all([
      searchAmazon(searchContext),
      searchNoon(searchContext),
    ]);

    externalResults = [
      ...amazonRes.map((r) => ({ ...r, _source: 'amazon' })),
      ...noonRes.map((r)   => ({ ...r, _source: 'noon'   })),
    ];
  }

  // 3. Merge and return
  return res.json(
    new ApiResponse(200, {
      local:    localResults,
      external: externalResults,
      meta: {
        query:           q,
        localCount:      localResults.length,
        externalCount:   externalResults.length,
        triggeredScraper,
      },
    })
  );
});

// GET /api/search/external
// Force external search regardless of local results count
const searchExternal = asyncHandler(async (req, res) => {
  const { q, category, maxPrice } = req.query;

  const searchContext = {
    category: category || 'other',
    keywords: q.split(' ').filter((w) => w.length > 2),
    budget:   { max: maxPrice || null, currency: 'EGP' },
  };

  const [amazonRes, noonRes] = await Promise.all([
    searchAmazon(searchContext),
    searchNoon(searchContext),
  ]);

  const results = [
    ...amazonRes.map((r) => ({ ...r, _source: 'amazon' })),
    ...noonRes.map((r)   => ({ ...r, _source: 'noon'   })),
  ];

  return res.json(new ApiResponse(200, { results, query: q }));
});

module.exports = { search, searchExternal };