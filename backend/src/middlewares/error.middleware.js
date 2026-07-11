const ApiError = require('../utils/apiError');

/**
 * Express error handling middleware.
 * Catches all errors, formats them into a standard API response, and sends the response.
 */
const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of ApiError, wrap it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  // Build standard error response body
  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || []
  };

  // Include stack trace only in local development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }

  // Print system-level stack trace for server logs on actual internal server errors
  if (error.statusCode >= 500) {
    console.error(`[Server Error] [${req.method}] ${req.path} :`, error.stack || error.message);
  } else {
    console.warn(`[Client Warn] [${req.method}] ${req.path} - ${error.statusCode}: ${error.message}`);
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorMiddleware;
