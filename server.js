const { createServer } = require('http');
const app              = require('./app');
const { env }          = require('./src/config/env');
const { connectDB }    = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');

async function startServer() {
    try {
        // 1. Validate environment variables (env.js already does this on import,
        //    but explicit logging here makes startup clear)
        console.log(`\n Starting Studivo API [${env.NODE_ENV}]...`);

        // 2. Connect to MongoDB
        await connectDB();

        // 3. Connect to Redis
        await connectRedis();

        // 4. Create HTTP server (we'll attach Socket.IO to it in Sprint 4)
        const httpServer = createServer(app);

        // 5. Start listening
        httpServer.listen(env.PORT, () => {
            console.log(`\n Server running on http://localhost:${env.PORT}`);
            console.log(`   Health check: http://localhost:${env.PORT}/health\n`);
        });

        // 6. Graceful shutdown — clean up connections on SIGTERM/SIGINT
        const shutdown = async (signal) => {
            console.log(`\n  ${signal} received. Shutting down gracefully...`);
            httpServer.close(() => {
                console.log('   HTTP server closed.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT',  () => shutdown('SIGINT'));

    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();