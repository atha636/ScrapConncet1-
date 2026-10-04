const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { cloudinary, hasCloudinaryConfig } = require("../config/cloudinary");

const SAFE_EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MIME_BY_EXT = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const LOCAL_DIR = path.resolve("private-uploads", "kyc"); // never served statically

// Saves an ID document privately. Cloudinary uploads use type "authenticated",
// so the file has no public URL at all; the local fallback (dev only) writes
// outside any statically-served folder.
async function saveKycDocument(buffer, mimetype) {
  const format = SAFE_EXTENSIONS[mimetype] || "jpg";

  if (hasCloudinaryConfig) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "scrapconnect/kyc", type: "authenticated", resource_type: "image" },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });
    return { storage: "cloudinary", ref: result.public_id, format };
  }

  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}.${format}`;
  fs.writeFileSync(path.join(LOCAL_DIR, name), buffer);
  return { storage: "local", ref: name, format };
}

// Returns { buffer, contentType } for an admin to view. Always proxied
// through the API so access is checked on every request.
async function readKycDocument({ storage, ref, format }) {
  const contentType = MIME_BY_EXT[format] || "image/jpeg";

  if (storage === "cloudinary") {
    const url = cloudinary.utils.private_download_url(ref, format, {
      type: "authenticated",
      resource_type: "image",
      expires_at: Math.floor(Date.now() / 1000) + 120,
    });
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Cloudinary fetch failed (${resp.status})`);
    return { buffer: Buffer.from(await resp.arrayBuffer()), contentType };
  }

  // basename() so a tampered ref can never escape LOCAL_DIR
  return { buffer: fs.readFileSync(path.join(LOCAL_DIR, path.basename(ref))), contentType };
}

module.exports = { saveKycDocument, readKycDocument };