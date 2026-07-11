/**
 * Wrapper function for Express controllers to catch async errors and pass them to next()
 * @param {Function} requestHandler - Asynchronous route handler function
 * @returns {Function} Express route handler middleware
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

module.exports = asyncHandler;
