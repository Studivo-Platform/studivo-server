const crypto                    = require('crypto');
const { User }                  = require('../models/User');
const { env }                   = require('../config/env');
const { ApiError }              = require('../utils/ApiError');
const { ApiResponse }           = require('../utils/ApiResponse');
const { asyncHandler }          = require('../utils/asyncHandler');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');
const authService               = require('../services/auth.service');
const cloudinaryService         = require("../services/cloudinary.service");
const userRepo                  = require('../repositories/user.repository');

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
        isProfileCompleted: true,
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

    const authPayload = await authService.issueAuthTokens(user, res);

    return res.json(new ApiResponse(200, authPayload, 'Logged in successfully'));
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
    const token = authService.getRefreshToken(req);
    if (!token) throw new ApiError(401, 'Refresh token not found');

    const payload = await authService.rotateRefreshToken(token, res);
    return res.json(new ApiResponse(200, payload, 'Token refreshed'));
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
    const token = authService.getRefreshToken(req);
    await authService.revokeRefreshToken(req.user._id, token);

    res.clearCookie('refreshToken');
    return res.json(new ApiResponse(200, null, 'Logged out successfully'));
});

// me
const getMe = asyncHandler(async (req, res) => {
    // req.user is set by auth.middleware.js
    return res.json(new ApiResponse(200, req.user));
});

// updateMe
const updateMe = asyncHandler(async (req, res) => {
    // req.user is set by auth.middleware.js
    const user = req.user;
    const updated = await userRepo.update(user._id, req.body);
    return res.json(new ApiResponse(200, updated, 'User updated successfully'));
});

// uploadProfileImage
const uploadAvatar = asyncHandler(async (req, res) => {
    // req.user is set by auth.middleware.js
    const user = req.user;
    if (!req.file) throw new ApiError(400, 'No image file uploaded');

    const uploadedImageProfile = await cloudinaryService.uploadImage(req.file?? null, {
        folder: 'studivo/profile' });

    if (uploadedImageProfile)
        user.profileImage = uploadedImageProfile.url;
    const updated = await userRepo.update(user._id, { profileImage: user.profileImage });
    return res.json(new ApiResponse(200, updated, 'Profile image updated successfully'));
});

// changePassword
const changePassword = asyncHandler(async (req, res) => {
    // req.user is set by auth.middleware.js
    const user = req.user;
    if(!(await user.comparePassword(req.body.currentPassword))) {
        throw new ApiError(400, 'Current password is incorrect');
    }
    user.password = req.body.newPassword;
    user.save();
    return res.json(new ApiResponse(200, updated, 'Password changed successfully'));
});

// googleCallback — called by passport after Google redirects back
const googleCallback = asyncHandler(async (req, res) => {
    const user = req.user;
    const redirectUrl = new URL('/auth/google/success', env.CLIENT_URL);

    if (!authService.isProfileComplete(user)) {
        redirectUrl.searchParams.set('requiresRole', 'true');
        redirectUrl.searchParams.set(
            'profileCompletionToken',
            authService.generateProfileCompletionToken(user._id)
        );

        return res.redirect(redirectUrl.toString());
    }

    const authPayload = await authService.issueAuthTokens(user, res);
    redirectUrl.searchParams.set('token', authPayload.accessToken);

    return res.redirect(redirectUrl.toString());
});

const completeProfile = asyncHandler(async (req, res) => {
    const token = authService.getProfileCompletionToken(req);
    if (!token) throw new ApiError(401, 'Profile completion token is required');

    const decoded = authService.verifyProfileCompletionToken(token);
    const user = await User.findById(decoded.userId).select('+refreshTokens');

    if (!user) throw new ApiError(404, 'User not found');
    if (!user.isActive) throw new ApiError(403, 'Your account has been deactivated. Contact support.');
    if (!user.isVerified) throw new ApiError(403, 'Account has not been verified');

    if (authService.isProfileComplete(user)) {
        const authPayload = await authService.issueAuthTokens(user, res);
        return res.json(new ApiResponse(200, authPayload, 'Profile already completed'));
    }

    user.role = req.body.role;
    user.isProfileCompleted = true;

    const authPayload = await authService.issueAuthTokens(user, res);
    return res.json(new ApiResponse(200, authPayload, 'Profile completed successfully'));
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
    updateMe,
    uploadAvatar,
    changePassword,
    googleCallback,
    completeProfile,
};
