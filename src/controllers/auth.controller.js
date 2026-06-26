const crypto                    = require('crypto');
const jwt                       = require('jsonwebtoken');
const { User }                  = require('../models/User');
const { env }                   = require('../config/env');
const { ApiError }              = require('../utils/ApiError');
const { ApiResponse }           = require('../utils/ApiResponse');
const { asyncHandler }          = require('../utils/asyncHandler');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');

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
    const hashedToken = crypto.createHash('sha256')
    .update(verificationToken).digest('hex');


    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user (password hashed by pre-save hook in User model)

    const user = await User.create({
        name,
        email,
        password,
        role,
        university,
        phone,
        verificationToken: hashedToken,
        verificationTokenExpires,
    });

    // Send verification email (don't await — let it happen in background)
    sendVerificationEmail(email, name, verificationToken)
    .catch((err) =>
        console.error('Failed to send verification email:', err.message)
    );

    return res
        .status(201)
        .json(new ApiResponse(201, { id: user._id, name: user.name, email: user.email }, 'Account created. Please check your email to verify.'));
    });

// login
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Select password explicitly since it's select: false in schema
    const user = await User.findOne({ email })
    .select('+password +refreshTokens +verificationToken +verificationTokenExpires');

    if (!user || !(await user.comparePassword(password))) {
        // Same error for both cases to prevent email enumeration
        throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
        throw new ApiError(403, 'Your account has been deactivated. Contact support.');
    }

    if (!user.isVerified) {
        // Generate a new raw token, store its hash and expiry, then email the raw token
        const rawVerificationToken = crypto.randomBytes(32).toString('hex');
        const hashedVerification = crypto.createHash('sha256')
        .update(rawVerificationToken).digest('hex');

        user.verificationToken = hashedVerification;
        user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        await user.save({ validateBeforeSave: false });

        sendVerificationEmail(user.email, user.name, rawVerificationToken)
            .catch((err) => console.error('Failed to send verification email:', err.message));

        throw new ApiError(403, 'Your account is not verified. Please check your email.');
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
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken
    }, 'Logged in successfully'));
});

// verifyEmail
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.params;

    const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

    // Check if token is valid
    const user = await User
        .findOne({ verificationToken: hashedToken, verificationTokenExpires: { $gt: Date.now() } })
        .select('+verificationToken +verificationTokenExpires');
    if (!user) {
        throw new ApiError(400, 'Invalid or expired verification token');
    }

    user.isVerified = true;
    user.verificationToken = undefined;  // Remove token after use
    user.verificationTokenExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return res.json(new ApiResponse(200, null, 'Email verified successfully. You can now log in.'));
});

// refreshToken
const refreshToken = asyncHandler(async (req, res) => {
    const token = getRefreshToken(req);
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

// PATCH /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    throw new ApiError(422, 'Passwords do not match');
  }

  // Hash the token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User
    .findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } })
    .select('+resetPasswordToken +resetPasswordExpires');

  if (!user) throw new ApiError(400, 'Invalid or expired reset token');

  user.password              = password;  // Pre-save hook hashes it
  user.resetPasswordToken    = undefined;
  user.resetPasswordExpires  = undefined;
  await user.save();

  return res.json(new ApiResponse(200, null, 'Password reset successfully. You can now log in.'));
});

// POST /api/auth/forgot-password (request reset email)
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return success — don't reveal if email exists
  if (!user) {
    return res.json(new ApiResponse(200, null, 'If this email exists, a reset link has been sent.'));
  }

  // Generate token
  const resetToken  = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken   = hashedToken;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  sendPasswordResetEmail(user.email, user.name, resetToken)
  .catch((err) => console.error('Failed to send password reset email:', err.message));

  return res.json(new ApiResponse(200, null, 'If this email exists, a reset link has been sent.'));
});

// logout
const logout = asyncHandler(async (req, res) => {
    const token = getRefreshToken(req);
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

// googleCallback — called by passport after Google redirects back
// Generates our own JWT tokens and sends them to the frontend
const googleCallback = asyncHandler(async (req, res) => {
  // req.user is set by passport after successful Google auth
    const user = req.user;

    const accessToken  = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store hashed refresh token
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await User.findByIdAndUpdate(user._id, {
        $push: { refreshTokens: hashedRefresh },
    });

    setRefreshTokenCookie(res, refreshToken);

    // Redirect to frontend with accessToken as query param
    // Frontend reads it once, stores in memory, then deletes from URL
    res.redirect(`${process.env.CLIENT_URL}/auth/google/success?token=${accessToken}`);
});

module.exports = {
    register,
    login,
    verifyEmail,
    refreshToken,
    resetPassword,
    forgotPassword,
    logout,
    getMe,
    googleCallback,
};