const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const PROFILE_COMPLETION_PURPOSE = 'complete_profile';
const PROFILE_COMPLETION_EXPIRES = '15m';

const publicRoles = ['student', 'seller'];

function generateAccessToken(userId, role) {
    return jwt.sign(
        { userId, role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_ACCESS_EXPIRES }
    );
}

function generateRefreshToken(userId) {
    return jwt.sign(
        { userId },
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES }
    );
}

function generateProfileCompletionToken(userId) {
    return jwt.sign(
        { userId, purpose: PROFILE_COMPLETION_PURPOSE },
        env.JWT_SECRET,
        { expiresIn: PROFILE_COMPLETION_EXPIRES }
    );
}

function verifyProfileCompletionToken(token) {
    let decoded;
    try {
        decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
        throw new ApiError(401, 'Invalid or expired profile completion token');
    }

    if (decoded.purpose !== PROFILE_COMPLETION_PURPOSE) {
        throw new ApiError(401, 'Invalid profile completion token');
    }

    return decoded;
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function setRefreshTokenCookie(res, token) {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}

function getRefreshToken(req) {
    const fromCookies = req?.cookies && typeof req.cookies === 'object'
        ? req.cookies.refreshToken
        : undefined;
    const fromBody = req?.body && typeof req.body === 'object'
        ? req.body.refreshToken
        : undefined;
    const fromHeaders = req?.headers && typeof req.headers === 'object'
        ? req.headers['x-refresh-token']
        : undefined;

    return fromCookies || fromBody || fromHeaders;
}

function getProfileCompletionToken(req) {
    const authHeader = req.headers?.authorization;
    const fromHeader = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : undefined;
    const fromBody = req.body?.profileCompletionToken;
    const fromQuery = req.query?.profileCompletionToken;

    return fromHeader || fromBody || fromQuery;
}

function isProfileComplete(user) {
    return Boolean(user?.role) && user?.isProfileCompleted !== false;
}

function assertCanIssueAuthTokens(user) {
    if (!user) throw new ApiError(401, 'User not found');
    if (!user.isActive) throw new ApiError(403, 'Your account has been deactivated. Contact support.');
    if (!user.isVerified) throw new ApiError(403, 'Account has not been verified');
    if (!isProfileComplete(user)) throw new ApiError(403, 'Profile completion is required');
}

function toAuthUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        isProfileCompleted: isProfileComplete(user),
    };
}

async function issueAuthTokens(user, res) {
    assertCanIssueAuthTokens(user);

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens = [...(user.refreshTokens || []), hashToken(refreshToken)];
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, refreshToken);

    return {
        user: toAuthUser(user),
        accessToken,
        refreshToken,
    };
}

async function rotateRefreshToken(token, res) {
    let decoded;
    try {
        decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch {
        throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const hashedToken = hashToken(token);
    const user = await User.findById(decoded.userId).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(hashedToken)) {
        throw new ApiError(401, 'Refresh token has been revoked');
    }

    assertCanIssueAuthTokens(user);

    const newRefreshToken = generateRefreshToken(user._id);
    const newHashed = hashToken(newRefreshToken);

    user.refreshTokens = user.refreshTokens
        .filter((storedToken) => storedToken !== hashedToken)
        .concat(newHashed);
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, newRefreshToken);

    return {
        accessToken: generateAccessToken(user._id, user.role),
    };
}

async function revokeRefreshToken(userId, token) {
    if (!token) return;

    await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: hashToken(token) },
    });
}

module.exports = {
    publicRoles,
    generateProfileCompletionToken,
    getProfileCompletionToken,
    getRefreshToken,
    hashToken,
    isProfileComplete,
    issueAuthTokens,
    revokeRefreshToken,
    rotateRefreshToken,
    setRefreshTokenCookie,
    toAuthUser,
    verifyProfileCompletionToken,
};
