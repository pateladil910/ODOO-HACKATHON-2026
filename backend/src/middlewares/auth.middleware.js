const jwt = require('jsonwebtoken');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

// Retrieve secret keys
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_12345';
const API_KEY = process.env.API_KEY || 'your_secret_api_key_for_external_clients';

/**
 * JWT Authentication Middleware
 * Validates incoming Authorization header bearer token
 */
const verifyJWT = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Optional cookie fallback
    token = req.cookies.token;
  }

  if (!token) {
    throw new ApiError(401, 'Access denied. No authentication token provided.');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Attach decoded user info to the request
    req.user = decoded; // Expecting { id, email, role }
    next();
  } catch (error) {
    throw new ApiError(401, 'Access denied. Invalid or expired token.');
  }
});

/**
 * API Key Verification Middleware
 * Validates client access using a dedicated API key
 */
const verifyApiKey = asyncHandler(async (req, res, next) => {
  const apiKeyHeader = req.headers['x-api-key'];

  if (!apiKeyHeader) {
    throw new ApiError(401, 'Access denied. API key is missing.');
  }

  if (apiKeyHeader !== API_KEY) {
    throw new ApiError(403, 'Access denied. Invalid API key.');
  }

  next();
});

/**
 * Role Authorization Middleware
 * Restricts endpoint to specified user roles (requires verifyJWT middleware to be executed first)
 * @param {...string} roles - Array of permitted roles (e.g. 'admin', 'user')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required before authorization.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied. Insufficient permissions for this action.'));
    }

    next();
  };
};

module.exports = {
  verifyJWT,
  verifyApiKey,
  restrictTo
};
