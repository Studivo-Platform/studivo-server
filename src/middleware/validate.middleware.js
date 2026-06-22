const { ApiError } = require('../utils/ApiError');

// Factory function: takes a Zod schema, returns an Express middleware
// Usage: router.post('/register', validate(registerSchema), authController.register)

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        // Format Zod errors into a readable array
        const errors = result.error.issues.map((err) => ({
        field:   err.path.join('.'),
        message: err.message,
        }));
        console.log(result.error.issues);
        return next(new ApiError(422, 'Validation failed', errors));
    }

    // Replace req.body with the validated and transformed data
    req.body = result.data;
    next();
};

module.exports = { validate };