const { env } = require('../config/env');

// Must have 4 parameters for Express to treat it as error middleware
const errorHandler = (err, req, res, next) => {
    // Default values if error isn't an ApiError
    let statusCode = err.statusCode || 500;
    let message    = err.message    || 'Internal Server Error';

    // Handle Mongoose validation errors ==> (e.g. required field missing)
    if (err.name === 'ValidationError') {
        statusCode = 422; // Unprocessable Entity 
        message    = 'Validation failed';

        // Get validation errors
        // console.log(err.errors);
        /*{
            name: ValidatorError {
                path: 'name',
                message: 'Path `name` is required.'
            },

            email: ValidatorError {
                path: 'email',
                message: 'Path `email` is required.'
            }
        }*/

        const errors = Object.values(err.errors).map((e) => ({
            field:   e.path,
            message: e.message,
        }));

        return res.status(statusCode).json({ success: false, message, errors });
    }

    // Handle Mongoose duplicate key error (e.g. email already exists)
    if (err.code === 11000) {
        statusCode = 409; // Conflict
        const field = Object.keys(err.keyValue)[0];
        message = `${field} already exists`;
    }

    // Handle invalid MongoDB ObjectId
    if (err.name === 'CastError') {
        statusCode = 400; // Bad Request
        message    = `Invalid ${err.path}: ${err.value}`;
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError')  { 
        statusCode = 401; // Unauthorized
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError')  { 
        statusCode = 401;
        message = 'Token expired'; 
    }

    // Log the error (only full stack in development)
    console.error(`[${new Date().toISOString()}] ${statusCode} ${req.method} ${req.path} — ${message}`);
    if (env.NODE_ENV === 'development')
        console.error(err.stack);

    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        ...(err.errors && { errors: err.errors }), 
        ...(env.NODE_ENV === 'development' && { stack: err.stack }), // only return stack in development
    });
};

module.exports = { errorHandler };