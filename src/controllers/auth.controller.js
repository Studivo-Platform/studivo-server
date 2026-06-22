const crypto                    = require('crypto');
const jwt                       = require('jsonwebtoken');
const { User }                  = require('../models/User');
const { env }                   = require('../config/env');
const { ApiError }              = require('../utils/ApiError');
const { ApiResponse }           = require('../utils/ApiResponse');
const { asyncHandler }          = require('../utils/asyncHandler');
const { sendVerificationEmail } = require('../services/email.service');

// Token helpers
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

// Sets refresh token as httpOnly cookie (more secure than localStorage)
function setRefreshTokenCookie(res, token) {
    res.cookie('refreshToken', token, {
        httpOnly: true,                           // JS cannot access this cookie
        secure:   env.NODE_ENV === 'production',  // HTTPS only in production
        sameSite: 'strict',                       // Prevent CSRF attacks
        maxAge:   7 * 24 * 60 * 60 * 1000,       // 7 days in ms
    });
}

// register
const register = asyncHandler(async (req, res) => {
    const { name, email, password, role, university, phone } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ApiError(409, 'An account with this email already exists');
    }

  // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user (password hashed by pre-save hook in User model)

    const user = await User.create({
        name,
        email,
        password,
        role,
        university,
        phone,
        verificationToken,
    });

    // Send verification email (don't await — let it happen in background)
    sendVerificationEmail(email, name, verificationToken)
    .catch((err) =>
        console.error('Failed to send verification email:', err.message)
    );

    return res
        .status(201)
        .json(new ApiResponse(201, { id: user._id, email: user.email }, 'Account created. Please check your email to verify.'));
    });

// login
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Select password explicitly since it's select: false in schema
    const user = await User.findOne({ email }).select('+password +refreshTokens');

    if (!user || !(await user.comparePassword(password))) {
        // Same error for both cases to prevent email enumeration
        throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
        throw new ApiError(403, 'Your account has been deactivated. Contact support.');
    }

    if (!user.isVerified) {
        throw new ApiError(403, 'Your account has not been verified. Please check your email.');
    }

    // Generate tokens
    const accessToken  = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store hashed refresh token in DB (for rotation/revocation)
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.refreshTokens = [...(user.refreshTokens || []), hashedRefresh];
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, refreshToken);

    return res.json(new ApiResponse(200, {
        accessToken,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
    }, 'Logged in successfully'));
});

// verifyEmail
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token }).select('+verificationToken');
    if (!user) {
        throw new ApiError(400, 'Invalid or expired verification token');
    }

    user.isVerified       = true;
    user.verificationToken = undefined;  // Remove token after use
    await user.save({ validateBeforeSave: false });

    return res.json(new ApiResponse(200, null, 'Email verified successfully. You can now log in.'));
});

// refreshToken
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.cookies;
    if (!token) throw new ApiError(401, 'Refresh token not found');

    let decoded;
    try {
        decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch {
        throw new ApiError(401, 'Invalid or expired refresh token');
    }

    // Check if this refresh token exists in the user's stored tokens
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findById(decoded.userId).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(hashedToken)) {
        throw new ApiError(401, 'Refresh token has been revoked');
    }

    // Rotate: remove old token, add new one
    const newRefreshToken = generateRefreshToken(user._id);
    const newHashed       = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    user.refreshTokens = user.refreshTokens
        .filter((t) => t !== hashedToken)
        .concat(newHashed);
    await user.save({ validateBeforeSave: false });

    const accessToken = generateAccessToken(user._id, user.role);
    setRefreshTokenCookie(res, newRefreshToken);

    return res.json(new ApiResponse(200, { accessToken }, 'Token refreshed'));
});

// logout
const logout = asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.cookies;

    if (token) {
        // Remove this refresh token from the user's stored tokens
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: hashedToken },
        });
    }

    res.clearCookie('refreshToken');
    return res.json(new ApiResponse(200, null, 'Logged out successfully'));
});

// me
const getMe = asyncHandler(async (req, res) => {
    // req.user is set by auth.middleware.js
    return res.json(new ApiResponse(200, req.user));
});

module.exports = {
    register,
    login,
    verifyEmail,
    refreshToken,
    logout,
    getMe,
};