/**
 * Custom request logging middleware.
 * Complements Morgan with detailed info about incoming payloads and execution speed in non-production environments.
 */
const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  
  // Track response completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Colored status representations in terminal logs
    let statusColor = '\x1b[32m'; // Green
    if (statusCode >= 400 && statusCode < 500) {
      statusColor = '\x1b[33m'; // Yellow
    } else if (statusCode >= 500) {
      statusColor = '\x1b[31m'; // Red
    }
    const resetColor = '\x1b[0m';

    console.log(
      `[API Request] ${method} ${originalUrl} | Status: ${statusColor}${statusCode}${resetColor} | Duration: ${duration}ms | IP: ${ip}`
    );
  });

  next();
};

module.exports = loggerMiddleware;
