// A minimal multer.StorageEngine that streams the upload straight to
// Cloudinary, implemented in-house rather than via the `multer-storage-
// cloudinary` package.
//
// That package's last release was 2020 and its package.json pins a peer
// dependency of `cloudinary: ^1.21.0` — it was never updated for the
// `cloudinary` v2 SDK. Cloudinary v1.x carries a high-severity advisory
// (arbitrary argument injection via an unescaped `&` in request params,
// GHSA-g4mf-96x5-5m2c) with no v1 patch, so moving off v1 means moving off
// this adapter too. The engine multer expects is small enough (just
// `_handleFile` and `_removeFile`) that reimplementing it directly against
// `cloudinary.uploader.upload_stream` removes an unmaintained dependency
// entirely instead of trading it for another one of uncertain upkeep.
//
// multer calls _handleFile once per uploaded file and expects the callback
// as (error) or (null, fileInfo). fileInfo becomes `req.file` in the route
// handler, so its shape matches what the app already reads elsewhere
// (`req.file.path`, e.g. in pickupController.createPickup).
class CloudinaryStorage {
  constructor({ cloudinary, folder, allowedFormats, transformation }) {
    this.cloudinary = cloudinary;
    this.folder = folder;
    this.allowedFormats = allowedFormats;
    this.transformation = transformation;
  }

  _handleFile(req, file, cb) {
    const uploadStream = this.cloudinary.uploader.upload_stream(
      {
        folder: this.folder,
        allowed_formats: this.allowedFormats,
        transformation: this.transformation,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return cb(error);
        cb(null, {
          path: result.secure_url,
          filename: result.public_id,
          size: result.bytes,
          mimetype: file.mimetype,
        });
      }
    );

    file.stream.on("error", (err) => uploadStream.destroy(err));
    file.stream.pipe(uploadStream);
  }

  // Called by multer if a later error in the request needs to unwind an
  // upload that already completed (e.g. a different file in the same
  // multipart request failed validation) — deletes the now-orphaned asset
  // from Cloudinary instead of leaving it stranded there forever.
  _removeFile(req, file, cb) {
    this.cloudinary.uploader.destroy(file.filename, (error) => cb(error));
  }
}

module.exports = CloudinaryStorage;