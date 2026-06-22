const { ApiError } = require('../utils/ApiError');

// Factory: requireRole('admin') returns a middleware
// Usage: router.get('/users', verifyJWT, requireRole('admin'), adminController.getUsers)
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
        return next(
        new ApiError(403, `Access denied. Required role: ${roles.join(' or ')}`)
        );
    }

    next();
};