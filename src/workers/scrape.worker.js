require('dotenv').config();
const { Worker }    = require('bullmq');
const { redis }     = require('../config/redis');
const { connectDB } = require('../config/db');
const { searchAmazon, searchNoon }    = require('../services/affiliate.service');
const { bulkCreate, deleteByRequest } = require('../repositories/scrapedResult.repository');

const connection = { host: redis.options.host, port: redis.options.port };

const processScrapeJob = async (job) => {
  const { requestId, parsedData } = job.data;

  console.log(`[Worker] Scraping for request ${requestId} — category: ${parsedData.category}`);

  // Run Amazon and Noon searches in parallel
  const [amazonResults, noonResults] = await Promise.all([
    searchAmazon(parsedData),
    searchNoon(parsedData),
  ]);

  const allResults = [...amazonResults, ...noonResults];

  if (!allResults.length) {
    console.log(`[Worker] No results found for request ${requestId}`);
    return { requestId, saved: 0 };
  }

  // Add requestId to each result before saving
  const toSave = allResults.map((r) => ({ ...r, requestId }));

  // Delete old results for this request before inserting new ones
  await deleteByRequest(requestId);
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