require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 5005;

/**
 * Bootstraps database connection and starts HTTP listener
 */
const startServer = async () => {
  try {
    console.log('[Server] Booting system. Testing Database Connectivity...');
    
    // Ensure DB is up before starting Express
    await db.testConnection();

    const server = app.listen(PORT, () => {
      console.log(`[Server] Express App running on Port ${PORT} (Environment: ${process.env.NODE_ENV || 'development'})`);
    });

    // Graceful Shutdown routines
    const gracefulShutdown = () => {
      console.log('[Server] Shutting down server and releasing pools...');
      server.close(() => {
        console.log('[Server] Express HTTP connections closed.');
        db.close().then(() => {
          console.log('[Server] Database connection pools terminated.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('[Server] CRITICAL: Startup sequence failed. Server stopped.');
    console.error(error.stack || error.message);
    process.exit(1);
  }
};

// Process-level event handlers for unexpected runtime failures
process.on('uncaughtException', (error) => {
  console.error('[CRITICAL ERROR] Uncaught Exception thrown:', error.stack || error.message);
  // Fail-fast on uncaught exceptions in Node
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL ERROR] Unhandled Promise Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
