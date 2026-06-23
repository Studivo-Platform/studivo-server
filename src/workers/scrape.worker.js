require('dotenv').config();
const { Worker } = require('bullmq');
const { redis }  = require('../config/redis');
const { connectDB } = require('../config/db');

const connection = { host: redis.options.host, port: redis.options.port };

// Worker processor — runs for each job in the scrapeQueue
// In Sprint 3 this will: call Amazon API + Noon API + Playwright → save ScrapedResults
const processScrapeJob = async (job) => {
  const { requestId, parsedData } = job.data;

  console.log(`[Worker] Processing scrape job ${job.id} for request ${requestId}`);
  console.log(`[Worker] Category: ${parsedData.category}, Keywords:`, parsedData.keywords);

  // TODO Sprint 3: call affiliate.service.js → save ScrapedResult documents
  // For now, just log and resolve
  return { status: 'placeholder', requestId };
};

// Start worker
async function startWorker() {
  await connectDB();

  const worker = new Worker('scrape', processScrapeJob, {
    connection,
    concurrency: 3,  // Process up to 3 jobs simultaneously
  });

  worker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Worker] Job ${job.id} failed:`, error.message);
  });

  console.log('[Worker] Scrape worker started. Waiting for jobs...');
}

startWorker().catch((err) => {
  console.error('[Worker] Failed to start:', err.message);
  process.exit(1);
});