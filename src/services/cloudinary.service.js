const { cloudinary } = require("../config/cloudinary");

const uploadImage = async (file, options = {}) => {
    const result = await cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        options,
    );

    return {
        publicId: result.public_id,
        url: result.secure_url,
    };
};

const uploadImages = async (files, options = {}) => {
    const uploads = files.map((file) => uploadImage(file, options));

    return Promise.all(uploads);
};

const deleteImage = async (publicId) => {
    return cloudinary.uploader.destroy(publicId);
};

module.exports = {
    uploadImage,
    uploadImages,
    deleteImage,
};
