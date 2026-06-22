const multer                  = require('multer');
const { CloudinaryStorage }   = require('multer-storage-cloudinary');
const { cloudinary }          = require('../config/cloudinary');
const { ApiError }            = require('../utils/ApiError');

// Profile image upload (single image, stored in 'studivo/profiles' folder)
const profileStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder:         'studivo/profiles',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 400, height: 400, crop: 'fill' }], // Auto-resize to 400x400
    },
});

// Offer images upload (up to 5 images, stored in 'studivo/offers' folder)
const offerStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder:         'studivo/offers',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, quality: 'auto' }],
    },
});

// File filter — reject non-image files before upload
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new ApiError(400, 'Only image files are allowed'), false);
    }
};

const uploadProfileImage = multer({
    storage:  profileStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single('profileImage');

const uploadOfferImages = multer({
    storage:  offerStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per file
}).array('images', 5); // Max 5 images2

module.exports = { uploadProfileImage, uploadOfferImages };