const multer = require("multer");
const path = require("path");

// ID documents are kept in memory only long enough to be handed to private
// storage (see utils/kycStorage.js) — they're never written to the public
// uploads/ folder or a public Cloudinary folder.
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.test(path.extname(file.originalname));
    cb(ok ? null : new Error("Only image files (jpg, png, webp) are allowed"), ok);
  },
});