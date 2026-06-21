const mongoose = require('mongoose');
const { env } = require('./env');

const MAX_RETRIES    = 5;
const RETRY_DELAY_MS = 5000;

async function connectDB(retryCount = 0) {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      // mongoose 8+ handles connection pooling automatically
      serverSelectionTimeoutMS: 5000, // fail fast if server not found
    });

    console.log('MongoDB connected:', mongoose.connection.host);

    // Listen for disconnection events in production
    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
    });

  } catch (error) {
    console.error(`MongoDB connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);

    if (retryCount < MAX_RETRIES - 1) {
      console.log(`   Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(retryCount + 1);
    }

    console.error('Max retries reached. Shutting down.');
    process.exit(1);
  }
}