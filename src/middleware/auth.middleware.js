const jwt              = require('jsonwebtoken');
const { User }         = require('../models/User');
const { env }          = require('../config/env');
const { ApiError }     = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

// Verifies JWT from Authorization header and attaches user to req
const verifyJWT = asyncHandler(async (req, res, next) => {
    // Token comes in header: "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError(401, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') 
            throw new ApiError(401, 'Access token has expired');
        throw new ApiError(401, 'Invalid access token');
    }

    // Fetch fresh user from DB (catches deactivated accounts mid-session)
    const user = await User.findById(decoded.userId);

    if (!user)            throw new ApiError(401, 'User no longer exists');
    if (!user.isActive)   throw new ApiError(403, 'Account has been deactivated');
    if (!user.isVerified) throw new ApiError(403, 'Account has not been verified');

    req.user = user;
    next();
});

module.exports = { verifyJWT };