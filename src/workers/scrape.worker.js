require('dotenv').config();
const { Worker }    = require('bullmq');
const { redis }     = require('../config/redis');
const { connectDB } = require('../config/db');
const { searchAmazon, searchNoon }    = require('../services/affiliate.service');
const { scrapeOLX, scrapeAqar, scrapeBtech } = require('../services/scraper.service');
const { bulkCreate, deleteByRequest } = require('../repositories/scrapedResult.repository');

const connection = { host: redis.options.host, port: redis.options.port };

const processScrapeJob = async (job) => {
  const { requestId, parsedData } = job.data;
  const category = parsedData.category;
  const keywords = parsedData.keywords.slice(0, 3).join(' ');

  console.log(`[Worker] Scraping for request ${requestId} — category: ${category}`);

  // Run in parallel — each source independent
  const scrapers = [searchAmazon(parsedData), searchNoon(parsedData)];

  // Add OLX for all categories
  scrapers.push(scrapeOLX(keywords, category));

  // Aqar only for housing
  if (category === 'housing') scrapers.push(scrapeAqar(keywords));

  // B.Tech only for electronics
  if (category === 'electronics') scrapers.push(scrapeBtech(keywords));

  const results = (await Promise.allSettled(scrapers))
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  const toSave = results.map((r) => ({ ...r, requestId }));

  // Delete old results for this request before inserting new ones
  await deleteByRequest(requestId);
  if (toSave.length)
    await bulkCreate(toSave);

  console.log(`[Worker] Saved ${toSave.length} results for request ${requestId}`);
  return { requestId, saved: toSave.length };
};

async function startWorker() {
  await connectDB();

  const worker = new Worker('scrape', processScrapeJob, {
    connection,
    concurrency: 3,
  });

  worker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} done:`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Worker] Job ${job.id} failed (attempt ${job.attemptsMade}):`, error.message);
  });

  console.log('[Worker] Scrape worker started — waiting for jobs...');
}

startWorker().catch((err) => {
  console.error('[Worker] Startup failed:', err.message);
  process.exit(1);
});