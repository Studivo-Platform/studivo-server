class ApiError extends Error {
    constructor(statusCode, message, errors = []) {
        super(message);
        this.statusCode = statusCode;
        this.errors     = errors;     // optional: array of validation errors
        this.isApiError = true;       // flag to identify in error middleware

        // Maintains proper stack trace in Node.js
        Error.captureStackTrace(this, this.constructor);
    }
}
// Usage: throw new ApiError(404, 'Request not found');

module.exports = { ApiError };