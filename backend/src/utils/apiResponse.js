/**
 * Standard API response template
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (typically 200, 201)
   * @param {any} data - Response payload data
   * @param {string} message - Descriptive success message
   */
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

module.exports = ApiResponse;
