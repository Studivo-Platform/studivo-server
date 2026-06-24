const { Router }  = require('express');
const offerController  = require('../controllers/offer.controller');
const { verifyJWT }       = require('../middleware/auth.middleware');
const { requireRole }     = require('../middleware/role.middleware');
const { validate }        = require('../middleware/validate.middleware');
const { uploadOfferImages } = require('../middleware/upload.middleware');
const { createOfferSchema, updateOfferSchema } = require('../validators/offer.validator');

const router = Router();

router.use(verifyJWT);

// Seller: submit offer (with optional image upload)
// multipart/form-data — images processed by multer before controller
router.post(
  '/',
  requireRole('seller'),
  uploadOfferImages,
  validate(createOfferSchema),
  offerController.createOffer
);

// Seller: view their own offers
router.get('/my', requireRole('seller'), offerController.getMyOffers);

// Both student and seller: view offers for a request
router.get('/request/:requestId', offerController.getOffersByRequest);

// Seller: update their own offer
router.patch(
  '/:id',
  requireRole('seller'),
  validate(updateOfferSchema),
  offerController.updateOffer
);

// Seller: withdraw their offer
router.delete('/:id', requireRole('seller'), offerController.withdrawOffer);

module.exports = router;