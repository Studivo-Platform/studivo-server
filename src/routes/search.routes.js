const { Router }     = require('express');
const searchController     = require('../controllers/search.controller');
const { verifyJWT }  = require('../middleware/auth.middleware');
const { validateQuery } = require('../middleware/validate.middleware');
const { searchQuerySchema } = require('../validators/search.validator');

const router = Router();

// Search is public — no auth required (but optional for personalization later)
router.get('/',        validateQuery(searchQuerySchema), searchController.search);
router.get('/external', verifyJWT, validateQuery(searchQuerySchema), searchController.searchExternal);

module.exports = router;