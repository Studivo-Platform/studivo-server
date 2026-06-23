const { Queue } = require('bullmq');
const { redis } = require('../config/redis');

// BullMQ uses Redis as its storage backend.
// We pass the same Redis connection from config/redis.js.
const connection = { host: redis.options.host, port: redis.options.port };

// scrapeQueue: holds jobs for scraping Amazon, Noon, OLX, Aqar
const scrapeQueue = new Queue('scrape', {
  connection,
  defaultJobOptions: {
    attempts:    3,     // Retry failed jobs up to 3 times
    backoff: {
      type:  'exponential',
      delay: 5000,      // 5s → 10s → 20s between retries
    },
    removeOnComplete: 100,   // Keep last 100 completed jobs in Redis
    removeOnFail:     50,    // Keep last 50 failed jobs for debugging
  },
});

// Add a scrape job to the queue
// Called right after a request is created
const addScrapeJob = async (requestId, parsedData) => {
  const job = await scrapeQueue.add(
    'scrapeForRequest',
    { requestId: requestId.toString(), parsedData },
    {
      // Job ID based on requestId — prevents duplicate jobs for same request
      jobId: `scrape:${requestId}`,
    }
  );

  console.log(`[Queue] Scrape job added: ${job.id} for request ${requestId}`);
  return job;
};

module.exports = { scrapeQueue, addScrapeJob };