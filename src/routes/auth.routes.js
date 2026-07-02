const { Router }        = require('express');
const passport          = require('../config/passport');
const authController    = require('../controllers/auth.controller');
const { validate }      = require('../middleware/validate.middleware');
const { verifyJWT }     = require('../middleware/auth.middleware');
const { authLimiter }   = require('../middleware/rateLimit.middleware');
const { uploadProfileImage } = require('../middleware/upload.middleware');
const { registerSchema,
        loginSchema,
        forgotPasswordSchema,
        resetPasswordSchema,
        completeProfileSchema,
        updateMeSchema,
        changePasswordSchema } = require('../validators/auth.validator');

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.get( '/verify/:token', authController.verifyEmail);
router.post('/refresh', authController.refreshToken);
router.post('/complete-profile', authLimiter, validate(completeProfileSchema), authController.completeProfile);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.patch('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Protected routes (requires valid JWT)
router.post('/logout',  verifyJWT, authController.logout);
router.get( '/me',      verifyJWT, authController.getMe);
router.patch('/profile',     verifyJWT,  validate(updateMeSchema), authController.updateMe);
router.post('/upload-avatar', verifyJWT, uploadProfileImage, authController.uploadAvatar);
router.patch('/change-password', verifyJWT, validate(changePasswordSchema), authController.changePassword);

// Step 1: Redirect user to Google login page
// Scope: we request email and profile (name + photo)
router.get('/google',
  passport.authenticate('google', { scope: ['email', 'profile'], session: false })
);

// Step 2: Google redirects back here after user approves
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`, session: false }),
  authController.googleCallback
);

module.exports = router;
