const Redis = require('ioredis');
const { env } = require('./env');

// Create a single Redis client instance — shared across the app
const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        // Exponential backoff: 1s, 2s, 4s... max 10s
        const delay = Math.min(times * 1000, 10000);
        console.warn(`Redis retry attempt ${times} — reconnecting in ${delay}ms`);
        return delay;
    },
    lazyConnect: true, // Don't connect until .connect() is called
});

async function connectRedis() {
  try {
    await redis.connect();
    console.log('Redis connected:', env.REDIS_URL);
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    process.exit(1);
  }
}

// Health check — used by server.js on startup
async function pingRedis() {
  const response = await redis.ping();
  return response === 'PONG';
}

module.exports = { redis, connectRedis, pingRedis };