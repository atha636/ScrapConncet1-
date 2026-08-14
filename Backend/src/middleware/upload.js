const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { cloudinary, hasCloudinaryConfig } = require("../config/cloudinary");

let storage;

// Extension → safe on-disk extension mapping, used only for the local dev
// fallback below. Deliberately not derived from the client-supplied
// extension string at all.
const SAFE_EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

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
    // Never build the on-disk filename from file.originalname — a crafted
    // name containing path separators or ".." segments could otherwise
    // write outside the uploads/ directory (or collide with/overwrite an
    // existing file). The stored name is fully server-generated; the only
    // thing taken from the upload is a safe, allowlisted extension.
    filename: (req, file, cb) => {
      const ext = SAFE_EXTENSIONS[file.mimetype] || ".jpg";
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

// Extension AND declared MIME type both have to match an image we accept.
// Neither check alone is strong — both are ultimately client-supplied
// metadata, not a verification of the actual file bytes — but requiring
// agreement between them is a cheap, genuinely additive layer that catches
// simple mismatches (e.g. an executable renamed to ".jpg" typically still
// reports its real, non-image content-type) without touching how files
// actually reach Cloudinary. True content-based verification (checking the
// file's magic-byte signature) needs the raw buffer before it's streamed
// to Cloudinary, which means restructuring the storage adapter itself —
// a bigger change to do deliberately, on staging, not bundled in here.
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

const fileFilter = (req, file, cb) => {
  const extOk = ALLOWED_EXTENSIONS.test(path.extname(file.originalname));
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const ok = extOk && mimeOk;
  cb(ok ? null : new Error("Only image files (jpg, png, webp) are allowed"), ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;