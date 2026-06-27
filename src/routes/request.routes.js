const { Router }   = require('express');
const requestController  = require('../controllers/request.controller');
const { verifyJWT }    = require('../middleware/auth.middleware');
const { requireRole }  = require('../middleware/role.middleware');
const { validate, validateQuery } = require('../middleware/validate.middleware');
const { aiLimiter }    = require('../middleware/rateLimit.middleware');
const { createRequestSchema, listRequestsSchema } = require('../validators/request.validator');

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Student: create a new request (rate limited — calls OpenAI)
router.post('/', requireRole('student'), aiLimiter, validate(createRequestSchema), requestController.createRequest);

// Student: view their own requests
router.get('/my', requireRole('student'), requestController.getMyRequests);

// Seller: browse open requests (filtered by category)
router.get('/', requireRole('seller', 'admin'), validateQuery(listRequestsSchema), requestController.getOpenRequests);

// Both: view single request details
router.get('/:id', requestController.getById);

// Student: close their request
router.patch('/:id/status', requireRole('student'), requestController.closeRequest);

module.exports = router;