const { upload } = require('../config/storage');

const uploadPhotos = upload.array('photos', 6);

const handleUpload = (req, res, next) => {
  uploadPhotos(req, res, function (err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Gagal mengunggah foto dokumentasi.'
      });
    }
    next();
  });
};

module.exports = {
  handleUpload
};
