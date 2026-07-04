/**
 * Resizes and re-encodes an image file in the browser before upload.
 * Phone-camera photos and screenshots easily run several MB — sending that
 * straight to the server means a slow upload AND a slow Cloudinary
 * transform on the other end. Shrinking to a sane max dimension + JPEG
 * quality here cuts both, often turning a multi-MB file into ~100-300KB.
 *
 * @param {File} file
 * @param {{ maxDimension?: number, quality?: number }} [opts]
 * @returns {Promise<File>}
 */
export function compressImage(file, { maxDimension = 1280, quality = 0.8 } = {}) {
  return new Promise((resolve) => {
    // Nothing to do for tiny files or non-image types — pass through as-is.
    if (!file.type.startsWith("image/") || file.size < 300 * 1024) {
      return resolve(file);
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file); // fall back to original on failure
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fall back to original rather than blocking the form
    };

    img.src = objectUrl;
  });
}