const multer = require("multer");
const path = require("path");
const { cloudinary, hasCloudinaryConfig } = require("../config/cloudinary");

let storage;

if (hasCloudinaryConfig) {
  const { CloudinaryStorage } = require("multer-storage-cloudinary");
  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "scrapconnect/pickups",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 1200, height: 1200, crop: "limit" }],
    },
  });
} else {
  // Dev fallback — local disk. NOTE: not durable on most hosts (Render/Vercel
  // wipe ephemeral disk on redeploy). Set CLOUDINARY_* env vars for production.
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${file.originalname}`),
  });
}

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase());
  cb(ok ? null : new Error("Only image files (jpg, png, webp) are allowed"), ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
