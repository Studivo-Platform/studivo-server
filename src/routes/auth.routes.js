const { Router }        = require('express');
const authController    = require('../controllers/auth.controller');
const { validate }      = require('../middleware/validate.middleware');
const { verifyJWT }     = require('../middleware/auth.middleware');
const { authLimiter }   = require('../middleware/rateLimit.middleware');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.get( '/verify/:token', authController.verifyEmail);
router.post('/refresh', authController.refreshToken);

// Protected routes (requires valid JWT)
router.post('/logout',  verifyJWT, authController.logout);
router.get( '/me',      verifyJWT, authController.getMe);

module.exports = router;