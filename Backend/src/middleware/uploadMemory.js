// Backend/src/middleware/uploadMemory.js
const multer = require('multer');

// Store files in memory (as Buffer) instead of writing to disk.
// Useful when you're immediately uploading the buffer to Cloudinary/S3/etc.
const storage = multer.memoryStorage();

const uploadMemory = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file, adjust as needed
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const isValid = allowedTypes.test(file.mimetype);
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
    }
  },
});

module.exports = uploadMemory;